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
   * Aggregates completed payments from the past 24 hours using STORED
   * per-transaction commission snapshots (platform_fee_amount /
   * provider_payout_amount). Never applies a hardcoded rate — each
   * doctor's individual commission is already baked into the payment row
   * at transaction time by BillingService + CommissionCalculator.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    name: 'admin_daily_revenue_reconciliation',
  })
  async reconcileDailyPlatformRevenue() {
    this.logger.log('Starting daily platform revenue reconciliation sweep...');

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    const { data: payments, error } = await this.supabase.admin
      .from('payments')
      .select('id, amount, platform_fee_amount, provider_payout_amount, status, created_at, doctor_id')
      .eq('status', 'Paid')
      .gte('created_at', yesterday)
      .lte('created_at', now);

    if (error) {
      this.logger.error(
        `Daily revenue reconciliation failed: ${error.message}`,
      );
      return;
    }

    const totalGross = (payments || []).reduce(
      (sum, p) => sum + (Number(p.amount) || 0),
      0,
    );
    // Use STORED per-transaction commission instead of a hardcoded rate
    const platformCommission = (payments || []).reduce(
      (sum, p) => sum + (Number(p.platform_fee_amount) || 0),
      0,
    );
    const doctorNetPayouts = (payments || []).reduce(
      (sum, p) => sum + (Number(p.provider_payout_amount) || Number(p.amount) || 0),
      0,
    );

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
        admins.map((admin) => {
          // 1. In-App + Web Push
          this.notifications
            .create(admin.id, {
              type: 'admin_daily_revenue_summary',
              title: 'Daily Platform Revenue Summary',
              message: `Yesterday's Settlement: ₹${totalGross.toLocaleString('en-IN')} gross volume across ${payments?.length || 0} consults (Platform Net: ₹${platformCommission.toLocaleString('en-IN')}).`,
              idempotencyKey: `admin_rev_${yesterday.slice(0, 10)}_${admin.id}`,
              data: {
                gross: totalGross,
                commission: platformCommission,
                date: yesterday.slice(0, 10),
                path: '/admin-dashboard/revenue',
              },
            })
            .catch(() => {});

          // 2. Email Summary via database-managed template
          if (admin.email) {
            this.email
              .sendTemplateEmail({
                templateKey: 'admin_daily_revenue_reconciliation',
                to: admin.email,
                variables: {
                  adminName: admin.full_name || 'Admin',
                  date: yesterday.slice(0, 10),
                  totalGross: `₹${totalGross.toLocaleString('en-IN')}`,
                  platformCommission: `₹${platformCommission.toLocaleString('en-IN')}`,
                  doctorNetPayouts: `₹${doctorNetPayouts.toLocaleString('en-IN')}`,
                  paidCount: payments?.length || 0,
                  analyticsUrl: this.email.getUrl('/admin-dashboard/revenue'),
                },
                entityType: 'daily_revenue',
                entityId: yesterday.slice(0, 10),
                event: 'admin_daily_revenue_reconciliation',
              })
              .catch(() => {});
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

    const fortyEightHoursAgo = new Date(
      Date.now() - 48 * 60 * 60 * 1000,
    ).toISOString();

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
      admins.map((admin) => {
        // 1. In-App + Web Push
        this.notifications
          .create(admin.id, {
            type: 'admin_kyc_escalation',
            title: 'Doctor KYC Reviews Overdue',
            message: `${pendingDoctors.length} doctor profile(s) have been waiting for verification for over 48 hours. Please review their medical licenses.`,
            data: { pendingCount: pendingDoctors.length },
          })
          .catch(() => {});

        // 2. Email Escalation via database-managed template
        if (admin.email) {
          const doctorListHtml = pendingDoctors
            .map(
              (d) =>
                `<li style="margin-bottom:6px;"><strong>Dr. ${d.full_name || 'Unknown'}</strong> (Submitted: ${new Date(d.kyc_submitted_at).toLocaleDateString()})</li>`,
            )
            .join('');
          this.email
            .sendTemplateEmail({
              templateKey: 'admin_doctor_kyc_escalation',
              to: admin.email,
              variables: {
                adminName: admin.full_name || 'Admin',
                pendingCount: pendingDoctors.length,
                doctorListHtml,
                verificationsUrl: this.email.getUrl('/admin-dashboard/verification'),
              },
              entityType: 'doctor_kyc_escalation',
              entityId: new Date().toISOString().slice(0, 10),
              event: 'admin_doctor_kyc_escalation',
            })
            .catch(() => {});
        }
      }),
    );

    this.logger.log(
      `Escalated ${pendingDoctors.length} overdue KYC review(s) to ${admins.length} admin(s).`,
    );
  }
}
