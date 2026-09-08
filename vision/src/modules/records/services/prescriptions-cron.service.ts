import { Injectable, Logger, Optional } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { NotificationsService } from '@/modules/notifications/services/notifications.service';
import { EmailService } from '@/core/email/email.service';
import { CronLockService } from '@/core/scheduler/cron-lock.service';

@Injectable()
export class PrescriptionsCronService {
  private readonly logger = new Logger(PrescriptionsCronService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly notifications: NotificationsService,
    private readonly email: EmailService,
    @Optional() private readonly cronLock?: CronLockService,
  ) {}

  private async executeLocked(name: string, fn: () => Promise<any>) {
    if (this.cronLock?.runWithLock) {
      return this.cronLock.runWithLock(name, fn);
    }
    return fn();
  }

  /**
   * Runs daily at 9:00 AM IST.
   * Scans active prescriptions nearing expiry (within 5 days of completion)
   * and sends an automated refill / doctor review reminder.
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM, {
    name: 'prescription_refill_reminders',
    timeZone: 'Asia/Kolkata',
  })
  async sendPrescriptionRefillReminders() {
    await this.executeLocked('prescription_refill_reminders', async () => {
      this.logger.log('Starting daily prescription refill reminder sweep (IST)...');

      const today = new Date();
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

      // Look for active prescriptions created in the last 90 days that have not yet had a refill reminder sent
      const { data: activeRxList, error } = await this.supabase.admin
        .from('prescriptions')
        .select(
          'id, patient_id, med_name, dosage, duration, created_at, refill_reminder_sent_at',
        )
        .is('refill_reminder_sent_at', null)
        .gte('created_at', ninetyDaysAgo)
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
      const todayStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
      }).format(new Date());

      await Promise.all(
        claimed.map(async (rx) => {
          const patient = patientMap.get(rx.patient_id);
          const medName = rx.med_name || 'Medication';

          // 1. In-App + Web Push
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
              .sendTemplateEmail({
                templateKey: 'prescription_refill_reminder',
                to: patient.email,
                variables: {
                  patientName: patient.full_name || 'Patient',
                  medName,
                  duration: rx.duration || 'current course',
                  recordsUrl: this.email.getUrl('/patient-dashboard/prescriptions'),
                },
                entityType: 'prescription',
                entityId: rx.id,
                event: 'prescription_refill_reminder',
              })
              .catch(() => {});
          }
        }),
      );

      this.logger.log(
        `Sent ${claimed.length} prescription refill reminder(s) & emails.`,
      );
    });
  }

  /**
   * Runs daily at 8:00 AM IST.
   * Reminds patients with active holistic plans to log their diet and yoga routines.
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM, {
    name: 'lifestyle_daily_habit_reminder',
    timeZone: 'Asia/Kolkata',
  })
  async sendLifestyleDailyReminder() {
    await this.executeLocked('lifestyle_daily_habit_reminder', async () => {
      this.logger.log('Starting daily lifestyle habit reminder sweep (IST)...');
      const today = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
      }).format(new Date());
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

      // Find active holistic prescriptions within last 90 days
      const { data: activePlans, error } = await this.supabase.admin
        .from('prescriptions')
        .select('patient_id, instructions')
        .is('deleted_at', null)
        .gte('created_at', ninetyDaysAgo)
        .filter('instructions', 'ilike', '%"type":"healnari-holistic-v1"%')
        .limit(500);

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
    });
  }

  /**
   * Runs daily at 10:00 AM IST.
   * Scans completed teleconsultations with a recommended follow-up timeline
   * (e.g. 2 weeks / 14 days) and alerts the patient to schedule their follow-up appointment.
   */
  @Cron(CronExpression.EVERY_DAY_AT_10AM, {
    name: 'prescription_follow_up_reminders',
    timeZone: 'Asia/Kolkata',
  })
  async sendRecommendedFollowUpReminders() {
    await this.executeLocked('prescription_follow_up_reminders', async () => {
      this.logger.log('Starting recommended follow-up appointment sweep (IST)...');

      // Find appointments completed 10-16 days ago that have not yet had a follow-up reminder sent
      const now = Date.now();
      const fourteenDaysAgo = new Date(now - 16 * 24 * 60 * 60 * 1000).toISOString();
      const tenDaysAgo = new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString();
      const fourteenDaysAgoDate = fourteenDaysAgo.slice(0, 10);
      const tenDaysAgoDate = tenDaysAgo.slice(0, 10);

      const { data: completedApts, error } = await this.supabase.admin
        .from('appointments')
        .select(
          'id, patient_id, doctor_id, scheduled_date, follow_up_reminder_sent_at',
        )
        .eq('status', 'Done')
        .is('follow_up_reminder_sent_at', null)
        .lte('scheduled_date', tenDaysAgoDate)
        .gte('scheduled_date', fourteenDaysAgoDate)
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
        .select('id, patient_id, doctor_id, patient:profiles!appointments_patient_id_fkey(full_name, email)');

      if (!claimed?.length) return;

      // Check if patient already booked a future appointment with this doctor or clinic
      const patientIds = [...new Set(claimed.map((a) => a.patient_id))];
      const { data: futureApts } = await this.supabase.admin
        .from('appointments')
        .select('patient_id, doctor_id')
        .in('patient_id', patientIds)
        .in('status', ['Upcoming', 'Waiting', 'In Progress', 'HOLD', 'Requested', 'Approved'])
        .gte('scheduled_date', fourteenDaysAgoDate);

      const hasFutureApt = new Set(
        (futureApts || []).map((a) => `${a.patient_id}_${a.doctor_id}`),
      );

      // Extract specific follow-up advice if recorded on prescription
      const aptIds = claimed.map((a) => a.id);
      const { data: rxList } = await this.supabase.admin
        .from('prescriptions')
        .select('appointment_id, instructions')
        .in('appointment_id', aptIds)
        .is('deleted_at', null);

      const adviceByAptId = new Map<string, string>();
      (rxList || []).forEach((rx) => {
        if (rx.appointment_id && rx.instructions) {
          try {
            if (rx.instructions.startsWith('{')) {
              const parsed = JSON.parse(rx.instructions);
              if (parsed.followUpAdvice) {
                adviceByAptId.set(rx.appointment_id, String(parsed.followUpAdvice).trim());
              }
            } else {
              const match = rx.instructions.match(/(?:Next\s+)?Follow[- ]?up(?:\s+Review|\s+Consultation|\s+Advice)?:\s*([^\n\r]+)/i);
              if (match) adviceByAptId.set(rx.appointment_id, match[1].trim());
            }
          } catch {}
        }
      });

      const doctorIds = [...new Set(claimed.map((a) => a.doctor_id))];
      const { data: doctors } = await this.supabase.admin
        .from('profiles')
        .select('id, full_name')
        .in('id', doctorIds);
      const doctorNameById = new Map(
        (doctors || []).map((d) => [d.id, d.full_name]),
      );

      const todayTag = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
      }).format(new Date());
      let sentCount = 0;

      await Promise.all(
        claimed.map(async (apt: any) => {
          // Skip notifying if patient already has an upcoming consult scheduled with this doctor
          if (hasFutureApt.has(`${apt.patient_id}_${apt.doctor_id}`)) {
            return;
          }

          const docName = doctorNameById.get(apt.doctor_id) || 'Your Doctor';
          const specificAdvice = adviceByAptId.get(apt.id);
          const adviceSnippet = specificAdvice ? `: "${specificAdvice}"` : '';

          await this.notifications
            .create(apt.patient_id, {
              type: 'follow_up_recommended',
              title: 'Time for Your Follow-Up Review',
              message: `Dr. ${docName} recommended a follow-up review${adviceSnippet}. Book your follow-up consultation to track progress and titrate medications.`,
              idempotencyKey: `followup_${apt.id}_${todayTag}`,
              data: {
                appointmentId: apt.id,
                doctorId: apt.doctor_id,
                path: `/patient-dashboard/appointments?book=followup&doctorId=${apt.doctor_id}`,
              },
            })
            .catch(() => {});

          if (apt.patient?.email) {
            this.email
              .sendTemplateEmail({
                templateKey: 'patient_followup_reminder',
                to: apt.patient.email,
                variables: {
                  patientName: apt.patient.full_name || 'Patient',
                  doctorName: docName,
                  followUpAdvice: specificAdvice || 'Routine clinical review',
                  dashboardUrl: this.email.getUrl(`/patient-dashboard/appointments?book=followup&doctorId=${apt.doctor_id}`),
                },
                entityType: 'appointment',
                entityId: apt.id,
                event: 'patient_followup_reminder',
              })
              .catch(() => {});
          }

          sentCount++;
        }),
      );

      this.logger.log(`Sent ${sentCount} follow-up reminder(s). (Claimed: ${claimed.length})`);
    });
  }

  /**
   * Runs daily at 11:00 AM IST.
   * Reminds patients with doctor-requested lab investigations older than 3 days who haven't uploaded reports.
   */
  @Cron(CronExpression.EVERY_DAY_AT_11AM, {
    name: 'prescription_pending_lab_reminders',
    timeZone: 'Asia/Kolkata',
  })
  async sendPendingLabReportReminders() {
    await this.executeLocked('prescription_pending_lab_reminders', async () => {
      this.logger.log('Starting pending lab test report sweep (IST)...');

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

      const todayTag = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
      }).format(new Date());

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
    });
  }
}
