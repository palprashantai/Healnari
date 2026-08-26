import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { NotificationsGateway } from '@/modules/notifications/gateways/notifications.gateway';
import { PushSubscriptionsService } from '@/modules/push-subscriptions/services/push-subscriptions.service';
import { AuthUser } from '@/core/decorators/current-user.decorator';
import { ERROR_MESSAGES } from '@/core/constants/errors.constant';

export type NotificationSensitivity = 'low' | 'medium' | 'high';
export type NotificationCategory =
  | 'appointment_reminders'
  | 'doctor_messages'
  | 'consultation_updates'
  | 'health_reminders'
  | 'medication_reminders'
  | 'cycle_reminders'
  | 'marketing_notifications'
  | 'general';

export interface NotificationInput {
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  idempotencyKey?: string;
  category?: NotificationCategory;
  sensitivity?: NotificationSensitivity;
}

export interface NotificationPreferencesDto {
  appointment_reminders?: boolean;
  doctor_messages?: boolean;
  consultation_updates?: boolean;
  health_reminders?: boolean;
  medication_reminders?: boolean;
  cycle_reminders?: boolean;
  marketing_notifications?: boolean;
  sound_enabled?: boolean;
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  timezone?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly gateway: NotificationsGateway,
    private readonly push: PushSubscriptionsService,
  ) {}

  /** Maps notification type to its functional category */
  private getCategoryForType(type: string): NotificationCategory {
    switch (type) {
      case 'appointment_reminder':
      case 'appointment_delayed':
      case 'appointment_requested':
      case 'appointment_approved':
      case 'appointment_cancelled':
        return 'appointment_reminders';

      case 'appointment_called':
      case 'call_cancelled':
      case 'doctor_daily_agenda':
      case 'doctor_message':
        return 'doctor_messages';

      case 'prescription_issued':
      case 'prescription_refill_due':
      case 'refill_requested':
      case 'medication_reminder':
        return 'medication_reminders';

      case 'period_prediction':
      case 'fertility_window':
      case 'cycle_reminder':
        return 'cycle_reminders';

      case 'lab_report_requested':
      case 'lab_report_uploaded':
      case 'lab_report_reviewed':
      case 'lab_report_pending':
      case 'urgent_lab_result':
      case 'lifestyle_daily_reminder':
      case 'follow_up_recommended':
        return 'health_reminders';

      case 'payment_success':
      case 'payment_received':
      case 'payment_refund_processed':
      case 'care_plan_renewal_due':
      case 'admin_daily_revenue_summary':
      case 'admin_kyc_escalation':
      case 'admin_message':
        return 'consultation_updates';

      case 'broadcast':
      case 'marketing':
        return 'marketing_notifications';

      default:
        return 'general';
    }
  }

  /** Maps notification type to sensitivity level */
  private getSensitivityForType(type: string): NotificationSensitivity {
    switch (type) {
      case 'period_prediction':
      case 'fertility_window':
      case 'cycle_reminder':
      case 'prescription_issued':
      case 'prescription_refill_due':
      case 'refill_requested':
      case 'lab_report_requested':
      case 'lab_report_uploaded':
      case 'lab_report_reviewed':
      case 'lab_report_pending':
      case 'urgent_lab_result':
        return 'high';

      case 'appointment_reminder':
      case 'appointment_delayed':
      case 'appointment_called':
      case 'appointment_requested':
      case 'appointment_approved':
      case 'appointment_cancelled':
      case 'follow_up_recommended':
      case 'lifestyle_daily_reminder':
        return 'medium';

      default:
        return 'low';
    }
  }

  /**
   * Transforms sensitive health information into privacy-safe lockscreen summaries.
   * Lock screen push notifications must never leak private medical diagnoses, drug names,
   * lab test types, or reproductive details on shared or lock screens.
   */
  private sanitizePushPayloadForLockscreen(
    type: string,
    title: string,
    message: string,
    sensitivity: NotificationSensitivity,
  ): { title: string; body: string } {
    if (sensitivity !== 'high') {
      return { title, body: message };
    }

    switch (type) {
      case 'period_prediction':
      case 'fertility_window':
      case 'cycle_reminder':
        return {
          title: 'HealNari Health Tracker',
          body: 'You have a new update in your cycle & wellness tracker. Tap to review securely.',
        };

      case 'prescription_issued':
      case 'prescription_refill_due':
      case 'refill_requested':
      case 'medication_reminder':
        return {
          title: 'HealNari Care Plan',
          body: 'You have an update regarding your medication schedule. Tap to review in your portal.',
        };

      case 'lab_report_requested':
      case 'lab_report_uploaded':
      case 'lab_report_reviewed':
      case 'lab_report_pending':
      case 'urgent_lab_result':
        return {
          title: 'HealNari Clinical Update',
          body: 'A new lab investigation or clinical report update is available.',
        };

      default:
        return {
          title: 'HealNari Health Alert',
          body: 'You have a new secure health update. Tap to view securely.',
        };
    }
  }

  /** Determines if current time in the user's timezone falls within configured quiet hours */
  private isWithinQuietHours(startStr: string, endStr: string, timezone: string): boolean {
    try {
      const now = new Date();
      // Format current time in user's timezone as HH:mm
      const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: timezone || 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const parts = formatter.format(now).split(':');
      const currentMinutes = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);

      const [startH, startM] = (startStr || '22:00').split(':').map((v) => parseInt(v, 10));
      const [endH, endM] = (endStr || '07:00').split(':').map((v) => parseInt(v, 10));

      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      if (startMinutes <= endMinutes) {
        return currentMinutes >= startMinutes && currentMinutes < endMinutes;
      } else {
        // Wraps around midnight (e.g. 22:00 to 07:00)
        return currentMinutes >= startMinutes || currentMinutes < endMinutes;
      }
    } catch {
      return false;
    }
  }

  /** Retrieves or initializes user's notification preferences */
  async getPreferences(userId: string) {
    const { data } = await this.supabase.admin
      .from('notification_preferences')
      .select()
      .eq('user_id', userId)
      .maybeSingle();

    if (data) return data;

    // Default preferences fallback
    return {
      user_id: userId,
      appointment_reminders: true,
      doctor_messages: true,
      consultation_updates: true,
      health_reminders: true,
      medication_reminders: true,
      cycle_reminders: true,
      marketing_notifications: false,
      sound_enabled: true,
      quiet_hours_enabled: false,
      quiet_hours_start: '22:00',
      quiet_hours_end: '07:00',
      timezone: 'Asia/Kolkata',
    };
  }

  /** Updates user's notification preferences */
  async updatePreferences(user: AuthUser, dto: NotificationPreferencesDto) {
    const { data, error } = await this.supabase.admin
      .from('notification_preferences')
      .upsert(
        {
          user_id: user.id,
          ...dto,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      )
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  /**
   * Persists a notification for `userId`, enforces user preferences, deduplicates via
   * idempotency key, sanitizes lockscreen push payloads, and delivers via WebSocket + Web Push.
   */
  async create(userId: string, input: NotificationInput) {
    try {
      const category = input.category || this.getCategoryForType(input.type);
      const sensitivity = input.sensitivity || this.getSensitivityForType(input.type);

      // 1. Idempotency Check: prevent duplicate notifications
      if (input.idempotencyKey) {
        const { data: existing } = await this.supabase.admin
          .from('notifications')
          .select()
          .eq('user_id', userId)
          .eq('idempotency_key', input.idempotencyKey)
          .maybeSingle();

        if (existing) {
          this.logger.debug(`Skipping duplicate notification with idempotency key: ${input.idempotencyKey}`);
          return existing;
        }
      }

      // 2. Fetch User Notification Preferences
      const prefs = await this.getPreferences(userId);

      // Check if user has disabled this notification category
      const isCategoryEnabled = (prefs as any)[category] ?? true;
      if (!isCategoryEnabled) {
        this.logger.log(`User ${userId} opted out of category ${category}. Storing muted.`);
        const { data: mutedData } = await this.supabase.admin
          .from('notifications')
          .insert({
            user_id: userId,
            type: input.type,
            title: input.title,
            message: input.message,
            category,
            sensitivity,
            idempotency_key: input.idempotencyKey || null,
            status: 'suppressed_by_preferences',
            data: input.data || {},
          })
          .select()
          .maybeSingle();

        return mutedData;
      }

      // 3. Persist Active In-App Notification
      const { data, error } = await this.supabase.admin
        .from('notifications')
        .insert({
          user_id: userId,
          type: input.type,
          title: input.title,
          message: input.message,
          category,
          sensitivity,
          idempotency_key: input.idempotencyKey || null,
          status: 'delivered',
          delivered_at: new Date().toISOString(),
          data: input.data || {},
        })
        .select()
        .maybeSingle();

      if (error) throw error;

      // 4. Emit live in-app notification over WebSocket Gateway
      this.gateway.emitToUser(userId, data);

      // 5. Check Quiet Hours for Web Push
      const isUrgent = input.type === 'appointment_called' || input.type === 'urgent_lab_result';
      const inQuietHours =
        prefs.quiet_hours_enabled &&
        this.isWithinQuietHours(prefs.quiet_hours_start, prefs.quiet_hours_end, prefs.timezone);

      if (inQuietHours && !isUrgent) {
        this.logger.log(`Push deferred/suppressed for user ${userId} during quiet hours (${prefs.quiet_hours_start}-${prefs.quiet_hours_end}).`);
        return data;
      }

      // 6. Privacy Sanitization for OS Push / Lockscreen
      const pushContent = this.sanitizePushPayloadForLockscreen(
        input.type,
        input.title,
        input.message,
        sensitivity,
      );

      // 7. Deliver Web Push Notification
      this.push
        .sendToUser(userId, {
          title: pushContent.title,
          body: pushContent.body,
          data: {
            ...input.data,
            id: data.id,
            type: input.type,
            category,
            sensitivity,
          },
        })
        .catch(() => {});

      return data;
    } catch (err: any) {
      this.logger.warn(`Failed to create notification for user ${userId}: ${err.message}`);
      return null;
    }
  }

  async list(user: AuthUser, page: number = 1, limit: number = 20) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count } = await this.supabase.admin
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(from, to);

    return {
      items: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: count ? Math.ceil(count / limit) : 0,
    };
  }

  async markRead(user: AuthUser, id: string) {
    const { data: existing } = await this.supabase.admin.from('notifications').select().eq('id', id).maybeSingle();
    if (!existing) throw new NotFoundException(ERROR_MESSAGES.NOTIFICATION_NOT_FOUND);
    if (existing.user_id !== user.id) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);

    const { data } = await this.supabase.admin
      .from('notifications')
      .update({ read: true, opened_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();
    return data;
  }

  async markAllRead(user: AuthUser) {
    await this.supabase.admin
      .from('notifications')
      .update({ read: true, opened_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('read', false);
    return this.list(user, 1, 20);
  }
}
