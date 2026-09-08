import { Injectable, Logger, Optional } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { NotificationsService } from '@/modules/notifications/services/notifications.service';
import { EmailService } from '@/core/email/email.service';
import { CronLockService } from '@/core/scheduler/cron-lock.service';

@Injectable()
export class DoctorsCronService {
  private readonly logger = new Logger(DoctorsCronService.name);

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
   * Runs daily at 7:45 AM (Asia/Kolkata).
   * Compiles and sends each doctor a morning agenda digest of their scheduled
   * clinic visits and video teleconsultations for the day.
   */
  @Cron('0 45 7 * * *', {
    name: 'doctor_daily_agenda',
    timeZone: 'Asia/Kolkata',
  })
  async sendDoctorDailyAgenda() {
    return this.executeLocked('doctor_daily_agenda', async () => {
      this.logger.log('Starting daily doctor agenda digest sweep...');

      const todayStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
      }).format(new Date());

      const { data: todaysApts, error } = await this.supabase.admin
        .from('appointments')
        .select('id, doctor_id, patient_id, scheduled_time, type, status')
        .eq('scheduled_date', todayStr)
        .in('status', ['Upcoming', 'Waiting', 'Requested'])
        .order('scheduled_time', { ascending: true });

      if (error) {
        this.logger.warn(`Doctor agenda sweep failed: ${error.message}`);
        return 0;
      }

      if (!todaysApts || todaysApts.length === 0) {
        this.logger.log('No appointments scheduled for today.');
        return 0;
      }

      // Group appointments by doctor
      const byDoctor = new Map<string, typeof todaysApts>();
      for (const apt of todaysApts) {
        if (!byDoctor.has(apt.doctor_id)) {
          byDoctor.set(apt.doctor_id, []);
        }
        byDoctor.get(apt.doctor_id)!.push(apt);
      }

      const doctorIds = [...byDoctor.keys()];
      const { data: doctors } = await this.supabase.admin
        .from('profiles')
        .select('id, full_name, email')
        .in('id', doctorIds);

      const doctorProfileMap = new Map((doctors || []).map((d) => [d.id, d]));

      await Promise.all(
        [...byDoctor.entries()].map(async ([doctorId, list]) => {
          const videoCount = list.filter((a) =>
            a.type?.toLowerCase().includes('video'),
          ).length;
          const clinicCount = list.length - videoCount;
          const firstTime = list[0]?.scheduled_time || '9:00 AM';
          const doc = doctorProfileMap.get(doctorId);
          const docName = doc?.full_name || 'Doctor';

          // 1. In-App Notification & Web Push
          this.notifications
            .create(doctorId, {
              type: 'doctor_daily_agenda',
              title: `Good morning, Dr. ${docName}`,
              message: `You have ${list.length} consultation(s) scheduled today (${videoCount} Video, ${clinicCount} Clinic). First patient is at ${firstTime}.`,
              idempotencyKey: `doctor_agenda_${doctorId}_${todayStr}`,
              data: {
                totalAppointments: list.length,
                firstAppointmentTime: firstTime,
                path: '/doctor-dashboard/appointments',
              },
            })
            .catch((err) =>
              this.logger.warn(
                `Failed to send agenda push to doctor ${doctorId}: ${err.message}`,
              ),
            );

          // 2. Transactional HTML Email Digest via database-managed template
          if (doc?.email) {
            const formattedDate = new Intl.DateTimeFormat('en-US', {
              timeZone: 'Asia/Kolkata',
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            }).format(new Date());

            const appointmentRows = list
              .map(
                (apt) => `
              <tr>
                <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-weight:bold;color:#0f172a;">${apt.scheduled_time || 'Scheduled'}</td>
                <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;color:#64748b;">${apt.type || 'Consultation'}</td>
                <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;"><span style="background:${apt.type?.toLowerCase().includes('video') ? '#e0f2fe;color:#0369a1' : '#f1f5f9;color:#475569'};padding:2px 8px;border-radius:6px;font-size:11px;font-weight:bold;">${apt.status || 'Upcoming'}</span></td>
              </tr>
            `,
              )
              .join('');

            this.email
              .sendTemplateEmail({
                templateKey: 'doctor_daily_agenda',
                to: doc.email,
                variables: {
                  doctorName: docName,
                  formattedDate,
                  totalPatients: list.length,
                  videoCount,
                  firstTime,
                  appointmentsTable: appointmentRows,
                  dashboardUrl: this.email.getUrl('/doctor-dashboard/appointments'),
                },
                entityType: 'doctor_daily_agenda',
                entityId: doc.id,
                event: 'doctor_daily_agenda',
              })
              .catch(() => {});
          }
        }),
      );

      this.logger.log(
        `Sent morning agenda digests & emails to ${byDoctor.size} doctor(s).`,
      );
      return byDoctor.size;
    });
  }

  /**
   * Runs daily at 2:00 AM (Asia/Kolkata).
   * Sweeps stale unfulfilled appointments from previous days (Waiting / Requested)
   * without touching patient clinical notes or cancelling active In Progress consultations.
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM, {
    name: 'doctor_stale_consultation_archival',
    timeZone: 'Asia/Kolkata',
  })
  async archiveStaleConsultations() {
    return this.executeLocked('doctor_stale_consultation_archival', async () => {
      this.logger.log('Starting stale consultation archival sweep...');

      const todayStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
      }).format(new Date());

      // Safe update: Sets cancellation_reason instead of overwriting clinical notes,
      // and explicitly excludes 'In Progress' sessions.
      const { data: staleApts, error } = await this.supabase.admin
        .from('appointments')
        .update({
          status: 'Cancelled',
          cancellation_reason: 'Auto-closed by system midnight maintenance.',
        })
        .lt('scheduled_date', todayStr)
        .in('status', ['Waiting', 'Requested'])
        .select('id');

      if (error) {
        this.logger.error(`Stale consultation archival failed: ${error.message}`);
        return 0;
      }

      if (staleApts?.length) {
        this.logger.log(
          `Auto-archived ${staleApts.length} stale consultation(s) from previous days.`,
        );
      }

      return staleApts?.length || 0;
    });
  }
}

