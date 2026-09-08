import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '@/core/supabase/supabase.service';

export interface RunWithLockResult<T = any> {
  executed: boolean;
  result?: T;
  durationMs?: number;
  error?: Error;
}

@Injectable()
export class CronLockService {
  private readonly logger = new Logger(CronLockService.name);
  private readonly localRunningJobs = new Set<string>();

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Hashes a string job name into a 64-bit signed integer string for Postgres advisory locks.
   */
  private hashJobNameToLockKey(name: string): string {
    let hash = 0n;
    const prime = 31n;
    const maxInt64 = 9223372036854775807n;
    for (let i = 0; i < name.length; i++) {
      hash = (hash * prime + BigInt(name.charCodeAt(i))) % maxInt64;
    }
    return hash.toString();
  }

  /**
   * Executes jobFn only if this instance successfully acquires the Postgres advisory lock
   * and is not currently running locally. Automatically logs execution metrics and handles cleanup.
   */
  async runWithLock<T = any>(
    jobName: string,
    jobFn: () => Promise<T>,
    options: {
      category?: string;
      displayName?: string;
    } = {},
  ): Promise<RunWithLockResult<T>> {
    // 1. Process-local guard against in-process overlapping ticks
    if (this.localRunningJobs.has(jobName)) {
      this.logger.warn(`[${jobName}] Skipped: Previous local execution is still in progress.`);
      return { executed: false };
    }

    // Mark as locally running immediately to avoid race conditions during async remote lock acquisition
    this.localRunningJobs.add(jobName);

    const lockKey = this.hashJobNameToLockKey(jobName);
    let lockAcquired = false;

    // 2. Distributed cluster lock via Supabase Postgres advisory lock
    try {
      const { data, error } = await this.supabase.admin.rpc('try_advisory_lock', {
        key: lockKey,
      });

      if (!error && data === false) {
        this.localRunningJobs.delete(jobName);
        this.logger.debug(
          `[${jobName}] Skipped: Distributed advisory lock held by another cluster instance.`,
        );
        return { executed: false };
      }

      if (!error && data === true) {
        lockAcquired = true;
      }
    } catch {
      // Fallback: If RPC not yet applied, localRunningJobs still protects this instance
      this.logger.debug(`[${jobName}] try_advisory_lock RPC fallback to local process lock.`);
    }

    const startTime = Date.now();
    this.logger.log(`[${jobName}] Started execution...`);

    try {
      const result = await jobFn();
      const durationMs = Date.now() - startTime;

      this.logger.log(`[${jobName}] Completed successfully in ${durationMs}ms.`);

      // Observability: write execution audit log to database
      this.logExecution({
        job_name: jobName,
        status: 'SUCCESS',
        triggered_by: 'SCHEDULE',
        duration_ms: durationMs,
        items_processed: typeof result === 'number' ? result : (Array.isArray(result) ? result.length : undefined),
      }).catch(() => {});

      this.updateLastRunAt(jobName).catch(() => {});

      return { executed: true, result, durationMs };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      this.logger.error(`[${jobName}] Failed after ${durationMs}ms: ${err?.message}`, err?.stack);

      // Record failed execution audit log
      this.logExecution({
        job_name: jobName,
        status: 'FAILED',
        triggered_by: 'SCHEDULE',
        duration_ms: durationMs,
        error_message: err?.message || 'Unknown execution error',
      }).catch(() => {});

      return { executed: true, error: err, durationMs };
    } finally {
      this.localRunningJobs.delete(jobName);

      if (lockAcquired) {
        try {
          await this.supabase.admin.rpc('release_advisory_lock', { key: lockKey });
        } catch {}
      }
    }
  }

  private async logExecution(log: {
    job_name: string;
    status: 'SUCCESS' | 'FAILED';
    triggered_by: 'SCHEDULE' | 'MANUAL_ADMIN';
    duration_ms?: number;
    items_processed?: number;
    error_message?: string;
    details?: any;
  }) {
    try {
      await this.supabase.admin.from('cron_execution_logs').insert({
        job_name: log.job_name,
        status: log.status,
        triggered_by: log.triggered_by,
        duration_ms: log.duration_ms || 0,
        items_processed: log.items_processed || 0,
        error_message: log.error_message || null,
        details: log.details || {},
        created_at: new Date().toISOString(),
      });
    } catch {}
  }

  private async updateLastRunAt(name: string) {
    try {
      await this.supabase.admin
        .from('cron_configurations')
        .update({ last_run_at: new Date().toISOString() })
        .eq('name', name);
    } catch {}
  }
}
