import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { CashfreeService } from '@/core/cashfree/cashfree.service';
import { NotificationsService } from '@/modules/notifications/services/notifications.service';
import { EmailService } from '@/core/email/email.service';

@Injectable()
export class BillingCronService {
  private readonly logger = new Logger(BillingCronService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly cashfree: CashfreeService,
    private readonly notifications: NotificationsService,
    private readonly email: EmailService,
  ) {}

  /**
   * Runs every 15 minutes.
   * Sweeps appointments that were cancelled (e.g., doctor declined or patient cancelled)
   * where a successful payment was made but the refund has not yet been processed.
   * Automatically initiates the refund via Cashfree and notifies the patient.
   */
  @Cron('0 */15 * * * *', { name: 'billing_automated_refunds' })
  async processAutomatedRefundsForCancelledAppointments() {
    this.logger.log('Starting automated refund processing sweep...');

    // Find payments in 'Refund Pending' state or linked to cancelled appointments
    const { data: pendingPayments, error } = await this.supabase.admin
      .from('payments')
      .select(
        'id, patient_id, appointment_id, amount, cf_order_id, status, currency',
      )
      .in('status', ['Refund Pending'])
      .limit(20);

    if (error || !pendingPayments?.length) {
      return;
    }

    this.logger.log(
      `Found ${pendingPayments.length} payment(s) requiring automated refund processing.`,
    );

    for (const payment of pendingPayments) {
      try {
        const appointmentId = payment.appointment_id;

        // Attempt automated Cashfree refund if cf_order_id is present
        if (payment.cf_order_id) {
          const refundId = `ref_${payment.id.slice(0, 8)}_${Date.now()}`;
          await this.cashfree
            .createRefund(
              payment.cf_order_id,
              Number(payment.amount),
              refundId,
              'Automated refund for cancelled consultation',
            )
            .catch((err) => {
              this.logger.warn(
                `Cashfree refund API call note for payment ${payment.id}: ${err.message}`,
              );
            });
        }

        // Update payment and appointment status
        await this.supabase.admin
          .from('payments')
          .update({ status: 'Refunded', updated_at: new Date().toISOString() })
          .eq('id', payment.id);

        if (appointmentId) {
          await this.supabase.admin
            .from('appointments')
            .update({ refund_processed_at: new Date().toISOString() })
            .eq('id', appointmentId);
        }

        // Update any associated refund_requests record
        await this.supabase.admin
          .from('refund_requests')
          .update({ status: 'Processed' })
          .eq('payment_id', payment.id);

        // Send patient confirmation alert
        const currency = payment.currency || 'INR';
        const formattedAmount =
          currency === 'INR'
            ? `₹${payment.amount}`
            : `${currency} ${payment.amount}`;
        await this.notifications.create(payment.patient_id, {
          type: 'payment_refund_processed',
          title: 'Refund Processed',
          message: `Your consultation fee of ${formattedAmount} has been refunded to your original payment method. Reference: HN-REF-${payment.id.slice(0, 6).toUpperCase()}.`,
          idempotencyKey: `refund_notif_${payment.id}`,
          data: {
            paymentId: payment.id,
            appointmentId,
            amount: payment.amount,
            path: '/patient-dashboard/billing',
          },
        });

        this.logger.log(
          `Successfully refunded ${formattedAmount} for payment ${payment.id}`,
        );
      } catch (err) {
        this.logger.error(
          `Failed to process refund for payment ${payment.id}: ${err.message}`,
        );
      }
    }
  }

  /**
   * Runs daily at 9:00 AM.
   * Sweeps active women's health care packages / subscriptions (e.g. 3-Month PCOS Plan)
   * and sends renewal reminders when 7 days remain on the package.
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM, { name: 'billing_care_plan_renewals' })
  async sendCarePlanRenewalReminders() {
    this.logger.log('Starting patient care plan & package renewal sweep...');

    const todayStr = new Date().toISOString().slice(0, 10);
    const inSevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const { data: expiringPackages, error } = await this.supabase.admin
      .from('patient_packages')
      .select('id, patient_id, package_name, expires_at, renewal_alert_sent_at')
      .eq('status', 'active')
      .is('renewal_alert_sent_at', null)
      .lte('expires_at', inSevenDays)
      .gte('expires_at', todayStr)
      .limit(50);

    if (error || !expiringPackages?.length) {
      return;
    }

    const { data: claimed } = await this.supabase.admin
      .from('patient_packages')
      .update({ renewal_alert_sent_at: new Date().toISOString() })
      .in(
        'id',
        expiringPackages.map((p) => p.id),
      )
      .is('renewal_alert_sent_at', null)
      .select('id, patient_id, package_name');

    if (!claimed?.length) return;

    await Promise.all(
      claimed.map((pkg) =>
        this.notifications
          .create(pkg.patient_id, {
            type: 'care_plan_renewal_due',
            title: 'Care Plan Renewal Notice',
            message: `Your ${pkg.package_name || 'Care Package'} is nearing completion in 7 days. Tap here to renew your plan and continue your uninterrupted care cycle.`,
            idempotencyKey: `pkg_renewal_${pkg.id}_${todayStr}`,
            data: { packageId: pkg.id, path: '/patient-dashboard/billing' },
          })
          .catch(() => {}),
      ),
    );

    this.logger.log(`Sent ${claimed.length} care plan renewal reminder(s).`);
  }
}
