import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { NotificationsGateway } from '@/modules/notifications/gateways/notifications.gateway';
import { PushSubscriptionsService } from '@/modules/push-subscriptions/services/push-subscriptions.service';
import { AuthUser } from '@/core/decorators/current-user.decorator';
import { ERROR_MESSAGES } from '@/core/constants/errors.constant';

export interface NotificationInput {
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly gateway: NotificationsGateway,
    private readonly push: PushSubscriptionsService,
  ) {}

  /** Persists a notification for `userId` and pushes it live if they're connected.
   * Best-effort by design: callers (appointment approval, call-next, broadcasts)
   * fire this alongside their real work and must not fail *that* action just
   * because notifying happened to fail. */
  async create(userId: string, input: NotificationInput) {
    try {
      const { data, error } = await this.supabase.admin.from('notifications').insert({
        user_id: userId,
        type: input.type,
        title: input.title,
        message: input.message,
        data: input.data || {},
      }).select().single();

      if (error) throw error;

      this.gateway.emitToUser(userId, data);
      this.push.sendToUser(userId, { title: input.title, body: input.message, data: { ...input.data, type: input.type } }).catch(() => {});
      return data;
    } catch (err) {
      this.logger.warn(`Failed to create notification for user ${userId}: ${err.message}`);
      return null;
    }
  }

  async list(user: AuthUser) {
    const { data } = await this.supabase.admin
      .from('notifications')
      .select()
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    return data || [];
  }

  async markRead(user: AuthUser, id: string) {
    const { data: existing } = await this.supabase.admin.from('notifications').select().eq('id', id).single();
    if (!existing) throw new NotFoundException(ERROR_MESSAGES.NOTIFICATION_NOT_FOUND);
    if (existing.user_id !== user.id) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);

    const { data } = await this.supabase.admin.from('notifications').update({ read: true }).eq('id', id).select().single();
    return data;
  }

  async markAllRead(user: AuthUser) {
    await this.supabase.admin.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
    return this.list(user);
  }
}
