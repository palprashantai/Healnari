import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { NotificationsService } from '@/modules/notifications/services/notifications.service';
import { EmailService } from '@/core/email/email.service';

@Injectable()
export class DoctorsCronService {
  private readonly logger = new Logger(DoctorsCronService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly notifications: NotificationsService,
    private readonly email: EmailService,
  ) {}

  /**
   * Runs daily at 7:45 AM.
   * Compiles and sends each doctor a morning agenda digest of their scheduled
   * clinic visits and video teleconsultations for the day.
   */
  @Cron('0 45 7 * * *', { name: 'doctor_daily_agenda' })
  async sendDoctorDailyAgenda() {
    this.logger.log('Starting daily doctor agenda digest sweep...');

    const todayStr = new Date().toISOString().slice(0, 10);

    const { data: todaysApts, error } = await this.supabase.admin
      .from('appointments')
      .select('id, doctor_id, patient_id, scheduled_time, type, status')
      .eq('scheduled_date', todayStr)
      .in('status', ['Upcoming', 'Waiting', 'Requested'])
      .order('scheduled_time', { ascending: true });

    if (error) {
      this.logger.warn(`Doctor agenda sweep failed: ${error.message}`);
      return;
    }

    if (!todaysApts || todaysApts.length === 0) {
      this.logger.log('No appointments scheduled for today.');
      return;
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

    const doctorProfileMap = new Map((doctors || []).map(d => [d.id, d]));

    await Promise.all(
      [...byDoctor.entries()].map(async ([doctorId, list]) => {
        const videoCount = list.filter(a => a.type?.toLowerCase().includes('video')).length;
        const clinicCount = list.length - videoCount;
        const firstTime = list[0]?.scheduled_time || '9:00 AM';
        const doc = doctorProfileMap.get(doctorId);
        const docName = doc?.full_name || 'Doctor';

        // 1. In-App Notification & Web Push
        this.notifications.create(doctorId, {
          type: 'doctor_daily_agenda',
          title: `Good morning, Dr. ${docName}`,
          message: `You have ${list.length} consultation(s) scheduled today (${videoCount} Video, ${clinicCount} Clinic). First patient is at ${firstTime}.`,
          idempotencyKey: `doctor_agenda_${doctorId}_${todayStr}`,
          data: { totalAppointments: list.length, firstAppointmentTime: firstTime, path: '/doctor-dashboard/appointments' },
        }).catch(err => this.logger.warn(`Failed to send agenda push to doctor ${doctorId}: ${err.message}`));

        // 2. Transactional HTML Email Digest via database-managed template
        if (doc?.email) {
          const formattedDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
          const appointmentRows = list.map(apt => `
            <tr>
              <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-weight:bold;color:#0f172a;">${apt.scheduled_time || 'Scheduled'}</td>
              <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;color:#64748b;">${apt.type || 'Consultation'}</td>
              <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;"><span style="background:${apt.type?.toLowerCase().includes('video') ? '#e0f2fe;color:#0369a1' : '#f1f5f9;color:#475569'};padding:2px 8px;border-radius:6px;font-size:11px;font-weight:bold;">${apt.status || 'Upcoming'}</span></td>
            </tr>
          `).join('');

          this.email.sendTemplatedMail({
            to: doc.email,
            slug: 'doctor_daily_agenda',
            defaultSubject: `Daily Patient Agenda ({{totalPatients}} appointments) - Dr. {{doctorName}}`,
            defaultHtml: `
              <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
                <h2 style="color:#0f172a;margin-top:0;">🌅 Good morning, Dr. {{doctorName}}</h2>
                <p style="color:#475569;font-size:14px;margin-bottom:16px;">Here is your scheduled consultation agenda for <strong>{{formattedDate}}</strong>:</p>
                
                <div style="display:flex;gap:12px;margin-bottom:16px;">
                  <div style="background:#f8fafc;padding:12px 16px;border-radius:8px;border:1px solid #e2e8f0;flex:1;">
                    <span style="font-size:11px;color:#64748b;display:block;">Total Patients</span>
                    <strong style="font-size:18px;color:#0f172a;">{{totalPatients}}</strong>
                  </div>
                  <div style="background:#f0fdf4;padding:12px 16px;border-radius:8px;border:1px solid #bbf7d0;flex:1;">
                    <span style="font-size:11px;color:#166534;display:block;">Video Consults</span>
                    <strong style="font-size:18px;color:#15803d;">{{videoCount}}</strong>
                  </div>
                  <div style="background:#faf5ff;padding:12px 16px;border-radius:8px;border:1px solid #f3e8ff;flex:1;">
                    <span style="font-size:11px;color:#7e22ce;display:block;">First Appointment</span>
                    <strong style="font-size:18px;color:#6b21a8;">{{firstTime}}</strong>
                  </div>
                </div>

                <table style="width:100%;text-align:left;border-collapse:collapse;margin:16px 0;font-size:13px;">
                  <thead>
                    <tr style="background:#f8fafc;color:#64748b;font-size:11px;text-transform:uppercase;">
                      <th style="padding:8px 12px;border-bottom:2px solid #e2e8f0;">Time</th>
                      <th style="padding:8px 12px;border-bottom:2px solid #e2e8f0;">Type</th>
                      <th style="padding:8px 12px;border-bottom:2px solid #e2e8f0;">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {{appointmentsTable}}
                  </tbody>
                </table>

                <div style="margin:24px 0 12px 0;">
                  <a href="{{dashboardUrl}}" style="background:#0f172a;color:#fff;padding:10px 20px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:13px;">Open Doctor Dashboard</a>
                </div>
                <p style="color:#94a3b8;font-size:11px;margin-top:20px;">HealNari Practice Management • Auto-generated daily at 7:45 AM</p>
              </div>
            `,
            variables: {
              doctorName: docName,
              formattedDate,
              totalPatients: list.length,
              videoCount,
              firstTime,
              appointmentsTable: appointmentRows,
              dashboardUrl: 'https://healnari.vercel.app/doctor/dashboard',
            },
          }).catch(() => {});
        }
      }),
    );

    this.logger.log(`Sent morning agenda digests & emails to ${byDoctor.size} doctor(s).`);
  }

  /**
   * Runs daily at 2:00 AM.
   * Sweeps stale appointments from previous days that were accidentally left
   * in 'In Progress' or 'Waiting' without being finalized, and auto-archives them.
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM, { name: 'doctor_stale_consultation_archival' })
  async archiveStaleConsultations() {
    this.logger.log('Starting stale consultation archival sweep...');

    const todayStr = new Date().toISOString().slice(0, 10);

    const { data: staleApts, error } = await this.supabase.admin
      .from('appointments')
      .update({ status: 'Cancelled', notes: 'Auto-closed by system midnight maintenance.' })
      .lt('scheduled_date', todayStr)
      .in('status', ['In Progress', 'Waiting', 'Requested'])
      .select('id');

    if (error) {
      this.logger.error(`Stale consultation archival failed: ${error.message}`);
      return;
    }

    if (staleApts?.length) {
      this.logger.log(`Auto-archived ${staleApts.length} stale consultation(s) from previous days.`);
    }
  }
}
