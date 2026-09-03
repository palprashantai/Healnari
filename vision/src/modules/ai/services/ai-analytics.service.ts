import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '@/core/supabase/supabase.service';
import type { AuthUser } from '@/core/decorators/current-user.decorator';

export interface AiAnalyticsEvent {
  event_type: string;
  user_id?: string;
  role?: string;
  feature?: string;
  session_id?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class AiAnalyticsService {
  private readonly logger = new Logger(AiAnalyticsService.name);
  private readonly inMemoryEvents: AiAnalyticsEvent[] = [];

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Tracks an AI product funnel event (fire-and-forget).
   */
  async track(event: AiAnalyticsEvent): Promise<void> {
    const entry: AiAnalyticsEvent = {
      ...event,
      metadata: event.metadata || {},
    };

    this.inMemoryEvents.unshift(entry);
    if (this.inMemoryEvents.length > 500) {
      this.inMemoryEvents.pop();
    }

    try {
      await this.supabase.admin.from('ai_analytics_events').insert({
        event_type: entry.event_type,
        user_id: entry.user_id || null,
        role: entry.role || null,
        feature: entry.feature || null,
        session_id: entry.session_id || null,
        metadata: entry.metadata,
      });
    } catch (err: any) {
      this.logger.debug(`Could not record ai_analytics_event: ${err?.message}`);
    }
  }

  /**
   * Helper to track paywall view
   */
  async trackPaywallView(user: AuthUser, featureKey: string): Promise<void> {
    return this.track({
      event_type: 'AI_PAYWALL_VIEWED',
      user_id: user.id,
      role: user.profile.role,
      feature: featureKey,
      metadata: { plan_id: user.profile.role === 'doctor' ? 'doctor_pro' : 'patient_premium' },
    });
  }

  /**
   * Helper to track doctor clinical action
   */
  async trackDoctorAction(
    user: AuthUser,
    featureKey: string,
    action: 'APPROVED' | 'EDITED' | 'DISMISSED',
    appointmentId?: string,
  ): Promise<void> {
    return this.track({
      event_type: `AI_DOCTOR_${action}`,
      user_id: user.id,
      role: 'doctor',
      feature: featureKey,
      metadata: { appointmentId, action },
    });
  }

  /**
   * Admin: Get Funnel Conversion Overview (from actual database events)
   */
  async getFunnelStats() {
    try {
      const { data: dbEvents } = await this.supabase.admin
        .from('ai_analytics_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      const events = (dbEvents && dbEvents.length > 0) ? dbEvents : this.inMemoryEvents;

      const counts: Record<string, number> = {};
      for (const ev of events) {
        counts[ev.event_type] = (counts[ev.event_type] || 0) + 1;
      }

      const paywallViews = counts['AI_PAYWALL_VIEWED'] || 0;
      const upgradeStarts = counts['AI_UPGRADE_STARTED'] || 0;
      const upgradeCompletes = counts['AI_UPGRADE_COMPLETED'] || 0;

      const conversionRate =
        paywallViews > 0 ? Number(((upgradeCompletes / paywallViews) * 100).toFixed(1)) : 0;

      return {
        paywallViews,
        upgradeStarts,
        upgradeCompletes,
        conversionRatePercent: conversionRate,
        doctorApprovals: counts['AI_DOCTOR_APPROVED'] || 0,
        doctorEdits: counts['AI_DOCTOR_EDITED'] || 0,
        recentEvents: events.slice(0, 20),
      };
    } catch (err: any) {
      this.logger.error(`Error calculating AI funnel stats: ${err?.message}`);
      return {
        paywallViews: 0,
        upgradeStarts: 0,
        upgradeCompletes: 0,
        conversionRatePercent: 0,
        doctorApprovals: 0,
        doctorEdits: 0,
        recentEvents: this.inMemoryEvents.slice(0, 20),
      };
    }
  }
}
