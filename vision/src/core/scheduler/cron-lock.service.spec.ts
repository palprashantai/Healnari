import { CronLockService } from './cron-lock.service';
import { createSupabaseMock } from '@/test-utils/supabase-mock';

describe('CronLockService — Distributed PostgreSQL Advisory Locking', () => {
  let cronLockService: CronLockService;
  let supabaseMock: any;

  beforeEach(() => {
    const { supabase } = createSupabaseMock({});
    supabaseMock = supabase;
    // Mock RPC calls for advisory locks
    supabaseMock.admin.rpc = jest.fn().mockImplementation((fnName: string) => {
      if (fnName === 'try_advisory_lock') {
        return Promise.resolve({ data: true, error: null });
      }
      if (fnName === 'release_advisory_lock') {
        return Promise.resolve({ data: true, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    cronLockService = new CronLockService(supabaseMock as any);
  });

  it('successfully acquires lock and executes task when lock is available', async () => {
    let taskExecuted = false;
    const result = await cronLockService.runWithLock('test_job', async () => {
      taskExecuted = true;
      return 'done';
    });

    expect(result.executed).toBe(true);
    expect(taskExecuted).toBe(true);
    expect(supabaseMock.admin.rpc).toHaveBeenCalledWith(
      'try_advisory_lock',
      expect.objectContaining({ key: expect.any(String) }),
    );
    expect(supabaseMock.admin.rpc).toHaveBeenCalledWith(
      'release_advisory_lock',
      expect.objectContaining({ key: expect.any(String) }),
    );
  });

  it('prevents overlapping local executions if same job is already running on this instance', async () => {
    let slowTaskFinish: () => void = () => {};
    const slowTask = new Promise<void>((resolve) => {
      slowTaskFinish = resolve;
    });

    // Launch first execution that takes time
    const firstRunPromise = cronLockService.runWithLock('concurrent_job', async () => {
      await slowTask;
      return 'first_done';
    });

    // Concurrently try running the same job name immediately
    const secondRunResult = await cronLockService.runWithLock('concurrent_job', async () => {
      return 'second_done';
    });

    // Second run should be skipped due to local in-flight lock
    expect(secondRunResult.executed).toBe(false);

    // Complete the first run
    slowTaskFinish();
    await firstRunPromise;
  });

  it('skips execution if PostgreSQL remote distributed advisory lock is held by another instance', async () => {
    // Simulate remote node holding lock
    supabaseMock.admin.rpc = jest.fn().mockImplementation((fnName: string) => {
      if (fnName === 'try_advisory_lock') {
        return Promise.resolve({ data: false, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    let taskExecuted = false;
    const result = await cronLockService.runWithLock('remote_held_job', async () => {
      taskExecuted = true;
    });

    expect(result.executed).toBe(false);
    expect(taskExecuted).toBe(false);
  });

  it('releases lock and logs audit even when task throws an error', async () => {
    const errorTask = async () => {
      throw new Error('Test intentional failure');
    };

    const result = await cronLockService.runWithLock('failing_job', errorTask);

    expect(result.executed).toBe(true);
    expect(result.error).toBeDefined();
    expect(result.error?.message).toBe('Test intentional failure');

    // Released lock
    expect(supabaseMock.admin.rpc).toHaveBeenCalledWith(
      'release_advisory_lock',
      expect.any(Object),
    );
  });
});
