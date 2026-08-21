import { Injectable, Logger } from '@nestjs/common';
import * as webpush from 'web-push';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { AuthUser } from '@/core/decorators/current-user.decorator';
import { SubscribeDto } from '@/modules/push-subscriptions/controllers/push-subscriptions.controller';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@healnari.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class PushSubscriptionsService {
  private readonly logger = new Logger(PushSubscriptionsService.name);

  constructor(private readonly supabase: SupabaseService) {}

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
    return data;
  }

  async unsubscribe(user: AuthUser, endpoint: string) {
    await this.supabase.admin
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('endpoint', endpoint);
  }

  /** Best-effort fan-out to every browser/device the user has subscribed
   * from. Dead subscriptions (410 Gone / 404) are pruned as they're found —
   * callers never need to know delivery details, this never throws. */
  async sendToUser(userId: string, payload: PushPayload) {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return; // push not configured — no-op

    const { data: subscriptions } = await this.supabase.admin
      .from('push_subscriptions')
      .select()
      .eq('user_id', userId);

    if (!subscriptions?.length) return;

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify(payload),
          );
        } catch (err) {
          const statusCode = err?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await this.supabase.admin.from('push_subscriptions').delete().eq('id', sub.id);
          } else {
            this.logger.warn(`Push send failed for subscription ${sub.id}: ${err.message}`);
          }
        }
      }),
    );
  }
}
