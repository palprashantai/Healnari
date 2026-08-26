import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { NotificationsService } from '@/modules/notifications/services/notifications.service';
import { EmailService } from '@/core/email/email.service';

@Injectable()
export class AdminCronService {
  private readonly logger = new Logger(AdminCronService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly notifications: NotificationsService,
    private readonly email: EmailService,
  ) {}

  /**
   * Runs daily at Midnight (00:00).
   * Aggregates completed payments from the past 24 hours, calculates gross volume,
   * platform commission (e.g. 15%), and logs the financial settlement summary.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { name: 'admin_daily_revenue_reconciliation' })
  async reconcileDailyPlatformRevenue() {
    this.logger.log('Starting daily platform revenue reconciliation sweep...');

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    const { data: payments, error } = await this.supabase.admin
      .from('payments')
      .select('id, amount, status, created_at, doctor_id')
      .eq('status', 'Paid')
      .gte('created_at', yesterday)
      .lte('created_at', now);

    if (error) {
      this.logger.error(`Daily revenue reconciliation failed: ${error.message}`);
      return;
    }

    const totalGross = (payments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const platformCommission = Math.round(totalGross * 0.15); // 15% Platform fee
    const doctorNetPayouts = totalGross - platformCommission;

    this.logger.log(
      `Daily Financial Settlement Reconciled: Gross = ₹${totalGross.toLocaleString('en-IN')}, Commission = ₹${platformCommission.toLocaleString('en-IN')}, Net Doctor Payouts = ₹${doctorNetPayouts.toLocaleString('en-IN')} across ${payments?.length || 0} transaction(s).`,
    );

    // Notify Admins of daily settlement summary
    const { data: admins } = await this.supabase.admin
      .from('profiles')
      .select('id, email, full_name')
      .eq('role', 'admin');

    if (admins?.length && totalGross > 0) {
      await Promise.all(
        admins.map(admin => {
          // 1. In-App + Web Push
          this.notifications.create(admin.id, {
            type: 'admin_daily_revenue_summary',
            title: 'Daily Platform Revenue Summary',
            message: `Yesterday's Settlement: ₹${totalGross.toLocaleString('en-IN')} gross volume across ${payments?.length || 0} consults (Platform Net: ₹${platformCommission.toLocaleString('en-IN')}).`,
            idempotencyKey: `admin_rev_${yesterday.slice(0, 10)}_${admin.id}`,
            data: { gross: totalGross, commission: platformCommission, date: yesterday.slice(0, 10), path: '/admin-dashboard/revenue' },
          }).catch(() => {});

          // 2. Email Summary via database-managed template
          if (admin.email) {
            this.email.sendTemplatedMail({
              to: admin.email,
              slug: 'admin_daily_revenue_reconciliation',
              defaultSubject: `HealNari Daily Settlement Report ({{date}})`,
              defaultHtml: `
                  <h2 style="color:#0f172a;margin-top:0;">📊 HealNari 24h Revenue Settlement Report</h2>
                  <p>Hello {{adminName}},</p>
                  <p>Here is the 24-hour financial reconciliation summary for <strong>{{date}}</strong>:</p>
                  <div style="background:#f8fafc;padding:16px;border-radius:8px;border:1px solid #e2e8f0;margin:16px 0;">
                    <p style="margin:4px 0;font-size:13px;color:#64748b;">Gross Consultation Volume: <strong style="color:#0f172a;">{{totalGross}}</strong></p>
                    <p style="margin:4px 0;font-size:13px;color:#64748b;">Platform Net Commission (15%): <strong style="color:#10b981;">{{platformCommission}}</strong></p>
                    <p style="margin:4px 0;font-size:13px;color:#64748b;">Doctor Payout Liabilities: <strong style="color:#0284c7;">{{doctorNetPayouts}}</strong></p>
                    <p style="margin:4px 0;font-size:13px;color:#64748b;">Total Paid Consultations: <strong style="color:#0f172a;">{{paidCount}}</strong></p>
                  </div>
                  <div style="margin-top:20px;">
                    <a href="{{analyticsUrl}}" style="background:#0f172a;color:#fff;padding:10px 20px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:13px;">View Revenue Analytics</a>
                  </div>
                  <p style="color:#94a3b8;font-size:11px;margin-top:20px;">HealNari Financial Operations • Automated Midnight Reconciliation</p>
            `,
              variables: {
                adminName: admin.full_name || 'Admin',
                date: yesterday.slice(0, 10),
                totalGross: `₹${totalGross.toLocaleString('en-IN')}`,
                platformCommission: `₹${platformCommission.toLocaleString('en-IN')}`,
                doctorNetPayouts: `₹${doctorNetPayouts.toLocaleString('en-IN')}`,
                paidCount: payments?.length || 0,
                analyticsUrl: 'https://healnari.vercel.app/admin/revenue',
              },
            }).catch(() => {});
          }
        }),
      );
    }
  }

  /**
   * Runs weekly on Mondays at 12:00 PM.
   * Checks for doctors who submitted KYC verification documents >48 hours ago
   * and are still pending admin verification, sending an escalation alert to administrators.
   */
  @Cron('0 0 12 * * 1', { name: 'admin_doctor_kyc_escalation' })
  async escalatePendingDoctorKyc() {
    this.logger.log('Starting pending doctor KYC escalation sweep...');

    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const { data: pendingDoctors, error } = await this.supabase.admin
      .from('profiles')
      .select('id, full_name, kyc_submitted_at, kyc_verified')
      .eq('role', 'doctor')
      .eq('kyc_verified', false)
      .not('kyc_submitted_at', 'is', null)
      .lte('kyc_submitted_at', fortyEightHoursAgo);

    if (error || !pendingDoctors?.length) {
      this.logger.log('No overdue pending doctor KYC reviews found.');
      return;
    }

    const { data: admins } = await this.supabase.admin
      .from('profiles')
      .select('id, email, full_name')
      .eq('role', 'admin');

    if (!admins?.length) return;

    await Promise.all(
      admins.map(admin => {
        // 1. In-App + Web Push
        this.notifications.create(admin.id, {
          type: 'admin_kyc_escalation',
          title: 'Doctor KYC Reviews Overdue',
          message: `${pendingDoctors.length} doctor profile(s) have been waiting for verification for over 48 hours. Please review their medical licenses.`,
          data: { pendingCount: pendingDoctors.length },
        }).catch(() => {});

        // 2. Email Escalation via database-managed template
        if (admin.email) {
          const doctorListHtml = pendingDoctors.map(d => `<li style="margin-bottom:6px;"><strong>Dr. ${d.full_name || 'Unknown'}</strong> (Submitted: ${new Date(d.kyc_submitted_at).toLocaleDateString()})</li>`).join('');
          this.email.sendTemplatedMail({
            to: admin.email,
            slug: 'admin_doctor_kyc_escalation',
            defaultSubject: `⚠️ [Escalation] {{pendingCount}} Doctor KYC Verifications Overdue (>48h)`,
            defaultHtml: `
              <h2 style="color:#e11d48;margin-top:0;">⚠️ Action Required: Doctor KYC Review Escalation</h2>
              <p>Hello {{adminName}},</p>
              <p>There are <strong>{{pendingCount}} doctor verification(s)</strong> that have been pending review for over 48 hours:</p>
              <ul style="color:#334155;font-size:13px;line-height:1.6;">
                {{doctorListHtml}}
              </ul>
              <div style="margin-top:20px;">
                <a href="{{verificationsUrl}}" style="background:#e11d48;color:#fff;padding:10px 20px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:13px;">Review Pending Doctor KYCs</a>
              </div>
          `,
            variables: {
              adminName: admin.full_name || 'Admin',
              pendingCount: pendingDoctors.length,
              doctorListHtml,
              verificationsUrl: 'https://healnari.vercel.app/admin/verifications',
            },
          }).catch(() => {});
        }
      }),
    );

    this.logger.log(`Escalated ${pendingDoctors.length} overdue KYC review(s) to ${admins.length} admin(s).`);
  }
}
