import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { NotificationsGateway } from '../gateways/notifications.gateway';
import { PushSubscriptionsService } from '@/modules/push-subscriptions/services/push-subscriptions.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let mockSupabase: any;
  let mockGateway: any;
  let mockPush: any;

  beforeEach(async () => {
    mockGateway = {
      emitToUser: jest.fn(),
    };

    mockPush = {
      sendToUser: jest.fn().mockResolvedValue(undefined),
    };

    const queryBuilder = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { id: 'notif-1', title: 'Test' },
        error: null,
      }),
      single: jest.fn().mockResolvedValue({
        data: { id: 'notif-1', title: 'Test' },
        error: null,
      }),
    };

    mockSupabase = {
      admin: {
        from: jest.fn().mockReturnValue(queryBuilder),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: SupabaseService, useValue: mockSupabase },
        { provide: NotificationsGateway, useValue: mockGateway },
        { provide: PushSubscriptionsService, useValue: mockPush },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should classify high-sensitivity notification (period prediction) and sanitize push lockscreen payload', async () => {
    await service.create('user-123', {
      type: 'period_prediction',
      title: 'Period Approaching',
      message: 'Your period is predicted to start in 2 days.',
    });

    expect(mockGateway.emitToUser).toHaveBeenCalledWith(
      'user-123',
      expect.objectContaining({ id: 'notif-1' }),
    );

    // Lockscreen push payload must be privacy-sanitized
    expect(mockPush.sendToUser).toHaveBeenCalledWith(
      'user-123',
      expect.objectContaining({
        title: 'HealNari Health Tracker',
        body: expect.stringContaining('cycle & wellness tracker'),
      }),
    );
  });

  it('should classify prescription refill as high sensitivity and sanitize lockscreen push payload', async () => {
    await service.create('user-123', {
      type: 'prescription_refill_due',
      title: 'Refill Due',
      message: 'Your course of Metformin 500mg is nearing completion.',
    });

    expect(mockPush.sendToUser).toHaveBeenCalledWith(
      'user-123',
      expect.objectContaining({
        title: 'HealNari Care Plan',
        body: expect.stringContaining('medication schedule'),
      }),
    );
  });
});
