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

    const { data: cycleLogs, error } = await this.supabase.admin
      .from('cycle_logs')
      .select('patient_id, log_date, flow, bbt, lh_ratio')
      .is('deleted_at', null)
      .order('log_date', { ascending: false });

    const userLatest = new Map<
      string,
      { userId: string; lastStart: Date; cycleLength: number }
    >();

    if (cycleLogs && cycleLogs.length > 0) {
      for (const log of cycleLogs) {
        if (!userLatest.has(log.patient_id)) {
          userLatest.set(log.patient_id, {
            userId: log.patient_id,
            lastStart: new Date(log.log_date),
            cycleLength: 28,
          });
        }
      }
    }

    // Also merge any period_logs if present
    const { data: periodLogs } = await this.supabase.admin
      .from('period_logs')
      .select('id, user_id, start_date, cycle_length, last_period_alert_date')
      .order('start_date', { ascending: false });

    if (periodLogs && periodLogs.length > 0) {
      for (const pl of periodLogs) {
        if (!userLatest.has(pl.user_id)) {
          userLatest.set(pl.user_id, {
            userId: pl.user_id,
            lastStart: new Date(pl.start_date),
            cycleLength: pl.cycle_length || 28,
          });
        }
      }
    }

    if (userLatest.size === 0) {
      this.logger.log('No period/cycle logs found for cycle prediction.');
      return;
    }

    const dueToNotify: Array<{ userId: string; daysUntil: number }> = [];

    for (const [userId, record] of userLatest) {
      const nextExpectedPeriod = new Date(
        record.lastStart.getTime() + record.cycleLength * 24 * 60 * 60 * 1000,
      );
      const diffDays = Math.ceil(
        (nextExpectedPeriod.getTime() - today.getTime()) /
          (24 * 60 * 60 * 1000),
      );

      // Alert when period is 2 days away or due today
      if (diffDays === 2 || diffDays === 1 || diffDays === 0) {
        dueToNotify.push({ userId, daysUntil: diffDays });
      }
    }

    if (dueToNotify.length === 0) return;

    await Promise.all(
      dueToNotify.map(async (item) => {
        const timeCopy =
          item.daysUntil === 0
            ? 'today'
            : `in ${item.daysUntil} day${item.daysUntil > 1 ? 's' : ''}`;
        return this.notifications
          .create(item.userId, {
            type: 'period_prediction',
            title: 'Period Approaching',
            message: `Your period is predicted to start ${timeCopy}. Keep a sanitary pad handy and log any symptoms in your HealNari tracker.`,
            idempotencyKey: `period_${item.userId}_${todayStr}_${item.daysUntil}`,
            data: {
              expectedInDays: item.daysUntil,
              path: '/patient-dashboard/tracking',
            },
          })
          .catch(() => {});
      }),
    );

    this.logger.log(
      `Sent ${dueToNotify.length} period prediction notification(s).`,
    );
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

    const { data: cycleLogs } = await this.supabase.admin
      .from('cycle_logs')
      .select('patient_id, log_date, flow, bbt, lh_ratio')
      .is('deleted_at', null)
      .order('log_date', { ascending: false });

    const userLatest = new Map<
      string,
      { userId: string; lastStart: Date; cycleLength: number }
    >();

    if (cycleLogs && cycleLogs.length > 0) {
      for (const log of cycleLogs) {
        if (!userLatest.has(log.patient_id)) {
          userLatest.set(log.patient_id, {
            userId: log.patient_id,
            lastStart: new Date(log.log_date),
            cycleLength: 28,
          });
        }
      }
    }

    // Also include any period_logs flagged for fertility tracking
    const { data: fertilityLogs } = await this.supabase.admin
      .from('period_logs')
      .select('id, user_id, start_date, cycle_length, is_tracking_fertility')
      .eq('is_tracking_fertility', true)
      .order('start_date', { ascending: false });

    if (fertilityLogs && fertilityLogs.length > 0) {
      for (const fl of fertilityLogs) {
        userLatest.set(fl.user_id, {
          userId: fl.user_id,
          lastStart: new Date(fl.start_date),
          cycleLength: fl.cycle_length || 28,
        });
      }
    }

    if (userLatest.size === 0) return;

    const dueToNotify: Array<{
      userId: string;
      phase: string;
      phaseKey: string;
    }> = [];

    for (const [userId, log] of userLatest) {
      const lastStart = log.lastStart;
      const cycleLength = log.cycleLength || 28;
      const daysSinceStart = Math.floor(
        (today.getTime() - lastStart.getTime()) / (24 * 60 * 60 * 1000),
      );

      const ovulationDay = cycleLength - 14; // Typical luteal phase estimation
      const fertileWindowStart = ovulationDay - 5;
      const fertileWindowEnd = ovulationDay + 1;

      if (daysSinceStart === fertileWindowStart) {
        dueToNotify.push({
          userId,
          phase:
            'Your fertile window begins today. High chance of conception over the next 5 days.',
          phaseKey: 'fertile_start',
        });
      } else if (daysSinceStart === ovulationDay) {
        dueToNotify.push({
          userId,
          phase:
            'Peak fertility day (predicted ovulation). Log your basal body temperature and LH strip tests.',
          phaseKey: 'ovulation_day',
        });
      }
    }

    if (dueToNotify.length === 0) return;

    await Promise.all(
      dueToNotify.map(async (item) => {
        return this.notifications
          .create(item.userId, {
            type: 'fertility_window',
            title: 'Fertility & Ovulation Update',
            message: item.phase,
            idempotencyKey: `fertility_${item.userId}_${todayStr}_${item.phaseKey}`,
            data: {
              trackingType: 'fertility',
              path: '/patient-dashboard/fertility',
            },
          })
          .catch(() => {});
      }),
    );

    this.logger.log(`Sent ${dueToNotify.length} fertile window alert(s).`);
  }
}
