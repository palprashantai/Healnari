import { Injectable, Logger } from '@nestjs/common';
import * as webpush from 'web-push';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { AuthUser } from '@/core/decorators/current-user.decorator';
import { SubscribeDto } from '@/modules/push-subscriptions/controllers/push-subscriptions.controller';

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class PushSubscriptionsService {
  private readonly logger = new Logger(PushSubscriptionsService.name);

  constructor(private readonly supabase: SupabaseService) {}

  private getVapidDetails() {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || 'mailto:support@healnari.com';

    if (!publicKey || !privateKey) {
      return null;
    }

    return { subject, publicKey, privateKey };
  }

  async subscribe(user: AuthUser, dto: SubscribeDto) {
    const { data, error } = await this.supabase.admin
      .from('push_subscriptions')
      .upsert(
        {
          user_id: user.id,
          endpoint: dto.endpoint,
          p256dh: dto.keys.p256dh,
          auth: dto.keys.auth,
          platform: dto.platform || null,
          user_agent: dto.userAgent || null,
          status: 'active',
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,endpoint' },
      )
      .select()
      .single();

    if (error) throw error;
    this.logger.log(`Registered push subscription for user ${user.id} (${dto.platform || 'web'})`);
    return data;
  }

  async unsubscribe(user: AuthUser, endpoint: string) {
    await this.supabase.admin
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('endpoint', endpoint);
    this.logger.log(`Unregistered push subscription for user ${user.id}`);
  }

  /**
   * Fan-out Web Push to every active device/browser for `userId`.
   * Sets TTL: 86400 and urgency: 'high' to wake mobile devices even when locked or in deep sleep.
   */
  async sendToUser(userId: string, payload: PushPayload) {
    const vapid = this.getVapidDetails();
    if (!vapid) {
      this.logger.warn(`VAPID keys not configured. Skipping Web Push for user ${userId}.`);
      return;
    }

    const { data: subscriptions, error } = await this.supabase.admin
      .from('push_subscriptions')
      .select()
      .eq('user_id', userId);

    if (error) {
      this.logger.error(`Failed to fetch push subscriptions for user ${userId}: ${error.message}`);
      return;
    }

    if (!subscriptions?.length) {
      this.logger.debug(`No active push subscriptions found for user ${userId}.`);
      return;
    }

    this.logger.log(`Dispatching high-urgency lockscreen push to user ${userId} across ${subscriptions.length} device(s)...`);

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            JSON.stringify(payload),
            {
              TTL: 86400,
              urgency: 'high',
              vapidDetails: vapid,
            },
          );
          this.logger.debug(`Lockscreen push delivered to endpoint ${sub.endpoint.slice(0, 40)}...`);
        } catch (err: any) {
          const statusCode = err?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            this.logger.log(`Pruning expired push subscription ${sub.id} (status: ${statusCode}).`);
            await this.supabase.admin.from('push_subscriptions').delete().eq('id', sub.id);
          } else {
            this.logger.warn(`Push delivery failed for subscription ${sub.id}: ${err.message}`);
          }
        }
      }),
    );
  }
}
