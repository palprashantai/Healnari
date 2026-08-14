import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { NotificationsService } from '@/modules/notifications/services/notifications.service';

@Injectable()
export class CyclePredictionCronService {
  private readonly logger = new Logger(CyclePredictionCronService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Runs daily at 7:00 AM.
   * Analyzes recent menstrual cycle logs, predicts upcoming periods 2 days in advance,
   * and notifies the patient to log premenstrual symptoms.
   */
  @Cron(CronExpression.EVERY_DAY_AT_7AM, { name: 'cycle_period_prediction' })
  async sendPeriodApproachingAlerts() {
    this.logger.log('Starting daily cycle & period prediction sweep...');

    const todayStr = new Date().toISOString().slice(0, 10);
    const today = new Date();

    // Query patients who have recorded period logs or cycle profiles
    const { data: cycleLogs, error } = await this.supabase.admin
      .from('period_logs')
      .select('id, user_id, start_date, cycle_length, last_period_alert_date')
      .order('start_date', { ascending: false });

    if (error || !cycleLogs?.length) {
      this.logger.log('No period logs found for cycle prediction.');
      return;
    }

    // Group logs by user to find their most recent start date and average cycle length
    const userLatest = new Map<string, { id: string; userId: string; lastStart: Date; cycleLength: number; lastAlertDate?: string }>();

    for (const log of cycleLogs) {
      if (!userLatest.has(log.user_id)) {
        userLatest.set(log.user_id, {
          id: log.id,
          userId: log.user_id,
          lastStart: new Date(log.start_date),
          cycleLength: log.cycle_length || 28, // Default 28 days if unassigned
          lastAlertDate: log.last_period_alert_date,
        });
      }
    }

    const dueToNotify: Array<{ logId: string; userId: string; daysUntil: number }> = [];

    for (const [userId, record] of userLatest) {
      if (record.lastAlertDate === todayStr) continue; // Already notified today

      const nextExpectedPeriod = new Date(record.lastStart.getTime() + record.cycleLength * 24 * 60 * 60 * 1000);
      const diffDays = Math.ceil((nextExpectedPeriod.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

      // Alert when period is 2 days away or due today
      if (diffDays === 2 || diffDays === 1 || diffDays === 0) {
        dueToNotify.push({ logId: record.id, userId, daysUntil: diffDays });
      }
    }

    if (dueToNotify.length === 0) return;

    // Idempotently update the last_period_alert_date
    await Promise.all(
      dueToNotify.map(async item => {
        await this.supabase.admin
          .from('period_logs')
          .update({ last_period_alert_date: todayStr })
          .eq('id', item.logId);

        const timeCopy = item.daysUntil === 0 ? 'today' : `in ${item.daysUntil} day${item.daysUntil > 1 ? 's' : ''}`;
        return this.notifications.create(item.userId, {
          type: 'period_prediction',
          title: 'Period Approaching',
          message: `Your period is predicted to start ${timeCopy}. Keep a sanitary pad handy and log any symptoms in your HealNari tracker.`,
          data: { expectedInDays: item.daysUntil },
        }).catch(() => {});
      }),
    );

    this.logger.log(`Sent ${dueToNotify.length} period prediction notification(s).`);
  }

  /**
   * Runs daily at 7:30 AM.
   * Calculates fertile window and ovulation day for fertility tracking users.
   */
  @Cron('0 30 7 * * *', { name: 'cycle_fertile_window' })
  async sendFertileWindowAlerts() {
    this.logger.log('Starting fertile window & ovulation sweep...');

    const todayStr = new Date().toISOString().slice(0, 10);
    const today = new Date();

    const { data: fertilityLogs, error } = await this.supabase.admin
      .from('period_logs')
      .select('id, user_id, start_date, cycle_length, is_tracking_fertility, last_fertility_alert_date')
      .eq('is_tracking_fertility', true)
      .order('start_date', { ascending: false });

    if (error || !fertilityLogs?.length) return;

    const userLatest = new Map<string, typeof fertilityLogs[0]>();
    for (const log of fertilityLogs) {
      if (!userLatest.has(log.user_id)) {
        userLatest.set(log.user_id, log);
      }
    }

    const dueToNotify: Array<{ logId: string; userId: string; phase: string }> = [];

    for (const [userId, log] of userLatest) {
      if (log.last_fertility_alert_date === todayStr) continue;

      const lastStart = new Date(log.start_date);
      const cycleLength = log.cycle_length || 28;
      const daysSinceStart = Math.floor((today.getTime() - lastStart.getTime()) / (24 * 60 * 60 * 1000));
      
      const ovulationDay = cycleLength - 14; // Typical luteal phase estimation
      const fertileWindowStart = ovulationDay - 5;
      const fertileWindowEnd = ovulationDay + 1;

      if (daysSinceStart === fertileWindowStart) {
        dueToNotify.push({ logId: log.id, userId, phase: 'Your fertile window begins today. High chance of conception over the next 5 days.' });
      } else if (daysSinceStart === ovulationDay) {
        dueToNotify.push({ logId: log.id, userId, phase: 'Peak fertility day (predicted ovulation). Log your basal body temperature and LH strip tests.' });
      }
    }

    if (dueToNotify.length === 0) return;

    await Promise.all(
      dueToNotify.map(async item => {
        await this.supabase.admin
          .from('period_logs')
          .update({ last_fertility_alert_date: todayStr })
          .eq('id', item.logId);

        return this.notifications.create(item.userId, {
          type: 'fertility_window',
          title: 'Fertility & Ovulation Update',
          message: item.phase,
          data: { trackingType: 'fertility' },
        }).catch(() => {});
      }),
    );

    this.logger.log(`Sent ${dueToNotify.length} fertile window alert(s).`);
  }
}
