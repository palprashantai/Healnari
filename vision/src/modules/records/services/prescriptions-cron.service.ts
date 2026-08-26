import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { NotificationsService } from '@/modules/notifications/services/notifications.service';
import { EmailService } from '@/core/email/email.service';

@Injectable()
export class PrescriptionsCronService {
  private readonly logger = new Logger(PrescriptionsCronService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly notifications: NotificationsService,
    private readonly email: EmailService,
  ) {}

  /**
   * Runs daily at 9:00 AM.
   * Scans active prescriptions nearing expiry (within 5 days of completion)
   * and sends an automated refill / doctor review reminder.
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM, {
    name: 'prescription_refill_reminders',
  })
  async sendPrescriptionRefillReminders() {
    this.logger.log('Starting daily prescription refill reminder sweep...');

    const today = new Date();
    // Look for active prescriptions created in the last 90 days that have not yet had a refill reminder sent
    const { data: activeRxList, error } = await this.supabase.admin
      .from('prescriptions')
      .select(
        'id, patient_id, med_name, dosage, duration, created_at, refill_reminder_sent_at',
      )
      .is('refill_reminder_sent_at', null)
      .limit(100);

    if (error) {
      this.logger.warn(`Prescription sweep failed: ${error.message}`);
      return;
    }

    if (!activeRxList || activeRxList.length === 0) {
      this.logger.log('No pending prescription refill reminders found.');
      return;
    }

    const dueToNotify: typeof activeRxList = [];

    for (const rx of activeRxList) {
      const createdAt = new Date(rx.created_at);
      // Parse days from duration string e.g. "30 Days", "10 Days", "90 Days"
      const daysMatch = rx.duration?.match(/(\d+)\s*days?/i);
      const totalDays = daysMatch ? parseInt(daysMatch[1], 10) : 30;

      const expiryDate = new Date(
        createdAt.getTime() + totalDays * 24 * 60 * 60 * 1000,
      );
      const daysRemaining = Math.ceil(
        (expiryDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
      );

      // Trigger reminder when 5 or fewer days are remaining
      if (daysRemaining <= 5 && daysRemaining >= 0) {
        dueToNotify.push(rx);
      }
    }

    if (dueToNotify.length === 0) return;

    // Atomic claim guard to prevent double-notification in distributed instances
    const { data: claimed } = await this.supabase.admin
      .from('prescriptions')
      .update({ refill_reminder_sent_at: new Date().toISOString() })
      .in(
        'id',
        dueToNotify.map((rx) => rx.id),
      )
      .is('refill_reminder_sent_at', null)
      .select('id, patient_id, med_name, duration');

    if (!claimed || claimed.length === 0) return;

    // Fetch patient emails
    const patientIds = [...new Set(claimed.map((rx) => rx.patient_id))];
    const { data: patients } = await this.supabase.admin
      .from('profiles')
      .select('id, email, full_name')
      .in('id', patientIds);

    const patientMap = new Map((patients || []).map((p) => [p.id, p]));

    await Promise.all(
      claimed.map(async (rx) => {
        const patient = patientMap.get(rx.patient_id);
        const medName = rx.med_name || 'Medication';

        // 1. In-App + Web Push
        const todayStr = today.toISOString().slice(0, 10);
        this.notifications
          .create(rx.patient_id, {
            type: 'prescription_refill_due',
            title: 'Prescription Refill Reminder',
            message: `Your prescription for ${medName} (${rx.duration || 'current course'}) is nearing completion. Tap here to request a refill or review with your doctor.`,
            idempotencyKey: `rx_refill_${rx.id}_${todayStr}`,
            data: {
              prescriptionId: rx.id,
              path: '/patient-dashboard/prescriptions',
            },
          })
          .catch((err) =>
            this.logger.warn(
              `Failed to notify patient ${rx.patient_id}: ${err.message}`,
            ),
          );

        // 2. Transactional Email Reminder via database-managed template
        if (patient?.email) {
          this.email
            .sendTemplatedMail({
              to: patient.email,
              slug: 'prescription_refill_reminder',
              defaultSubject: `Refill Reminder: {{medName}} expiring soon`,
              defaultHtml: `
                <h2 style="color:#7e22ce;margin-top:0;">💊 Prescription Refill Reminder</h2>
                <p>Hello {{patientName}},</p>
                <p>This is a friendly reminder that your current course of <strong>{{medName}}</strong> ({{duration}}) is nearing completion within the next 5 days.</p>
                <p>To avoid any disruption in your care plan, please re-order your medication or schedule a brief review with your doctor.</p>
                <div style="margin:20px 0;">
                  <a href="{{recordsUrl}}" style="background:#7e22ce;color:#fff;padding:10px 20px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:13px;">View Prescriptions & Refill</a>
                </div>
            `,
              variables: {
                patientName: patient.full_name || 'there',
                medName,
                duration: rx.duration || 'current course',
                recordsUrl: 'https://healnari.vercel.app/patient/records',
              },
            })
            .catch(() => {});
        }
      }),
    );

    this.logger.log(
      `Sent ${claimed.length} prescription refill reminder(s) & emails.`,
    );
  }

  @Cron(CronExpression.EVERY_DAY_AT_8AM, {
    name: 'lifestyle_daily_habit_reminder',
  })
  async sendLifestyleDailyReminder() {
    this.logger.log('Starting daily lifestyle habit reminder sweep...');
    const today = new Date().toISOString().slice(0, 10);

    // Find all active holistic prescriptions
    const { data: activePlans, error } = await this.supabase.admin
      .from('prescriptions')
      .select('patient_id, instructions')
      .is('deleted_at', null)
      .filter('instructions', 'ilike', '%"type":"healnari-holistic-v1"%');

    if (error || !activePlans?.length) return;

    // Filter to unique patients who haven't logged today
    const patientIds = [...new Set(activePlans.map((p) => p.patient_id))];
    const { data: logs } = await this.supabase.admin
      .from('lifestyle_logs')
      .select('patient_id')
      .in('patient_id', patientIds)
      .eq('log_date', today);

    const loggedPatients = new Set(logs?.map((l) => l.patient_id) || []);
    const dueToNotify = patientIds.filter((id) => !loggedPatients.has(id));

    if (dueToNotify.length === 0) return;

    for (const patientId of dueToNotify) {
      this.notifications
        .create(patientId, {
          type: 'lifestyle_daily_reminder',
          title: 'Daily Wellness Check-in',
          message: 'Remember to log your diet and yoga routines for today!',
          idempotencyKey: `lifestyle_${patientId}_${today}`,
          data: { path: '/patient-dashboard/tracking' },
        })
        .catch(() => {});
    }

    this.logger.log(
      `Sent ${dueToNotify.length} daily lifestyle habit reminder(s).`,
    );
  }

  /**
   * Runs daily at 10:00 AM.
   * Scans completed teleconsultations with a recommended follow-up timeline
   * (e.g. 2 weeks / 14 days) and alerts the patient to schedule their follow-up appointment.
   */
  @Cron(CronExpression.EVERY_DAY_AT_10AM, {
    name: 'prescription_follow_up_reminders',
  })
  async sendRecommendedFollowUpReminders() {
    this.logger.log('Starting recommended follow-up appointment sweep...');

    // Find appointments completed 10-16 days ago that have not yet had a follow-up reminder sent
    const fourteenDaysAgo = new Date(
      Date.now() - 14 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const tenDaysAgo = new Date(
      Date.now() - 10 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { data: completedApts, error } = await this.supabase.admin
      .from('appointments')
      .select(
        'id, patient_id, doctor_id, scheduled_date, follow_up_reminder_sent_at',
      )
      .eq('status', 'Done')
      .is('follow_up_reminder_sent_at', null)
      .lte('scheduled_at', tenDaysAgo)
      .gte('scheduled_at', fourteenDaysAgo)
      .limit(50);

    if (error || !completedApts?.length) return;

    // Atomic claim guard
    const { data: claimed } = await this.supabase.admin
      .from('appointments')
      .update({ follow_up_reminder_sent_at: new Date().toISOString() })
      .in(
        'id',
        completedApts.map((a) => a.id),
      )
      .is('follow_up_reminder_sent_at', null)
      .select('id, patient_id, doctor_id');

    if (!claimed?.length) return;

    const doctorIds = [...new Set(claimed.map((a) => a.doctor_id))];
    const { data: doctors } = await this.supabase.admin
      .from('profiles')
      .select('id, full_name')
      .in('id', doctorIds);
    const doctorNameById = new Map(
      (doctors || []).map((d) => [d.id, d.full_name]),
    );

    const todayTag = new Date().toISOString().slice(0, 10);
    await Promise.all(
      claimed.map((apt) =>
        this.notifications
          .create(apt.patient_id, {
            type: 'follow_up_recommended',
            title: 'Time for Your Follow-Up Review',
            message: `Dr. ${doctorNameById.get(apt.doctor_id) || 'Your Doctor'} recommended a review around this time. Book your follow-up consultation to track your progress and titrate medications.`,
            idempotencyKey: `followup_${apt.id}_${todayTag}`,
            data: {
              appointmentId: apt.id,
              doctorId: apt.doctor_id,
              path: '/patient-dashboard/appointments',
            },
          })
          .catch(() => {}),
      ),
    );

    this.logger.log(`Sent ${claimed.length} follow-up reminder(s).`);
  }

  /**
   * Runs daily at 11:00 AM.
   * Reminds patients with doctor-requested lab investigations older than 3 days who haven't uploaded reports.
   */
  @Cron(CronExpression.EVERY_DAY_AT_11AM, {
    name: 'prescription_pending_lab_reminders',
  })
  async sendPendingLabReportReminders() {
    this.logger.log('Starting pending lab test report sweep...');

    const threeDaysAgo = new Date(
      Date.now() - 3 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { data: pendingLabs, error } = await this.supabase.admin
      .from('lab_reports')
      .select('id, patient_id, test_name, reminder_sent_at, created_at')
      .eq('status', 'Requested')
      .is('reminder_sent_at', null)
      .lte('created_at', threeDaysAgo)
      .limit(50);

    if (error || !pendingLabs?.length) return;

    const { data: claimed } = await this.supabase.admin
      .from('lab_reports')
      .update({ reminder_sent_at: new Date().toISOString() })
      .in(
        'id',
        pendingLabs.map((l) => l.id),
      )
      .is('reminder_sent_at', null)
      .select('id, patient_id, test_name');

    if (!claimed?.length) return;

    const todayTag = new Date().toISOString().slice(0, 10);
    await Promise.all(
      claimed.map((lab) =>
        this.notifications
          .create(lab.patient_id, {
            type: 'lab_report_pending',
            title: 'Pending Lab Investigation',
            message: `Your doctor requested '${lab.test_name}'. Please upload your test results or schedule a home collection so your doctor can review them.`,
            idempotencyKey: `lab_pending_${lab.id}_${todayTag}`,
            data: { labId: lab.id, path: '/patient-dashboard/records' },
          })
          .catch(() => {}),
      ),
    );

    this.logger.log(`Sent ${claimed.length} pending lab test reminder(s).`);
  }
}
