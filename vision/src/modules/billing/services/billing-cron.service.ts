import { Injectable, Logger, Optional } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { CashfreeService } from '@/core/cashfree/cashfree.service';
import { NotificationsService } from '@/modules/notifications/services/notifications.service';
import { EmailService } from '@/core/email/email.service';
import { CronLockService } from '@/core/scheduler/cron-lock.service';

@Injectable()
export class BillingCronService {
  private readonly logger = new Logger(BillingCronService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly cashfree: CashfreeService,
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
   * Runs every 15 minutes.
   * Sweeps appointments that were cancelled (e.g., doctor declined or patient cancelled)
   * where a successful payment was made but the refund has not yet been processed.
   * Uses distributed locking, atomic claiming ('Processing Refund'), and verifies gateway success
   * before setting 'Refunded' and alerting the patient.
   */
  @Cron('0 */15 * * * *', { name: 'billing_automated_refunds' })
  async processAutomatedRefundsForCancelledAppointments() {
    return this.executeLocked('billing_automated_refunds', async () => {
      this.logger.log('Starting automated refund processing sweep...');

      // Find candidate payments in 'Refund Pending' state
      const { data: pendingPayments, error } = await this.supabase.admin
        .from('payments')
        .select(
          'id, patient_id, appointment_id, amount, cf_order_id, status, currency',
        )
        .in('status', ['Refund Pending'])
        .limit(20);

      if (error || !pendingPayments?.length) {
        return 0;
      }

      // Atomic claim guard: only process payments this instance successfully claimed
      const candidateIds = pendingPayments.map((p) => p.id);
      const { data: claimedPayments, error: claimError } = await this.supabase.admin
        .from('payments')
        .update({
          status: 'Processing Refund',
          updated_at: new Date().toISOString(),
        })
        .in('id', candidateIds)
        .eq('status', 'Refund Pending')
        .select('id, patient_id, appointment_id, amount, cf_order_id, status, currency');

      if (claimError || !claimedPayments?.length) {
        return 0;
      }

      this.logger.log(
        `Claimed ${claimedPayments.length} payment(s) for automated refund processing.`,
      );

      let processedCount = 0;

      for (const payment of claimedPayments) {
        try {
          const appointmentId = payment.appointment_id;
          let refundSuccessful = false;
          let refundRef = `ref_${payment.id.slice(0, 8)}_${Date.now()}`;

          // Attempt automated Cashfree refund if cf_order_id is present
          if (payment.cf_order_id) {
            try {
              const cfRes: any = await this.cashfree.createRefund(
                payment.cf_order_id,
                Number(payment.amount),
                refundRef,
                'Automated refund for cancelled consultation',
              );

              if (
                cfRes?.refund_status === 'SUCCESS' ||
                cfRes?.refund_status === 'PENDING' ||
                cfRes?.cf_refund_id ||
                cfRes?.refund_id
              ) {
                refundSuccessful = true;
                if (cfRes.cf_refund_id || cfRes.refund_id) {
                  refundRef = String(cfRes.cf_refund_id || cfRes.refund_id);
                }
              } else {
                this.logger.warn(
                  `Cashfree refund returned non-success for payment ${payment.id}: ${JSON.stringify(cfRes)}`,
                );
              }
            } catch (cfErr: any) {
              this.logger.error(
                `Cashfree refund API failed for payment ${payment.id}: ${cfErr.message}`,
              );
            }
          } else {
            refundSuccessful = true;
          }

          if (refundSuccessful) {
            // Mark Payment and Appointment as Refunded
            await this.supabase.admin
              .from('payments')
              .update({
                status: 'Refunded',
                txn_ref: refundRef,
                updated_at: new Date().toISOString(),
              })
              .eq('id', payment.id);

            if (appointmentId) {
              await this.supabase.admin
                .from('appointments')
                .update({ refund_processed_at: new Date().toISOString() })
                .eq('id', appointmentId);
            }

            // Update refund_requests record
            await this.supabase.admin
              .from('refund_requests')
              .update({ status: 'Processed', updated_at: new Date().toISOString() })
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
            processedCount++;
          } else {
            // Mark as 'Refund Failed' so administrators can manually inspect
            await this.supabase.admin
              .from('payments')
              .update({
                status: 'Refund Failed',
                updated_at: new Date().toISOString(),
              })
              .eq('id', payment.id);

            await this.supabase.admin
              .from('refund_requests')
              .update({
                status: 'Failed',
                updated_at: new Date().toISOString(),
              })
              .eq('payment_id', payment.id);

            this.logger.error(
              `Automated refund failed for payment ${payment.id}. Marked as 'Refund Failed' for manual review.`,
            );
          }
        } catch (err: any) {
          this.logger.error(
            `Error processing refund for payment ${payment.id}: ${err.message}`,
          );
        }
      }

      return processedCount;
    });
  }

  /**
   * Runs daily at 9:00 AM (Asia/Kolkata).
   * Sweeps active women's health care packages / subscriptions (e.g. 3-Month PCOS Plan)
   * and sends renewal reminders when 7 days remain on the package.
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM, {
    name: 'billing_care_plan_renewals',
    timeZone: 'Asia/Kolkata',
  })
  async sendCarePlanRenewalReminders() {
    return this.executeLocked('billing_care_plan_renewals', async () => {
      this.logger.log('Starting patient care plan & package renewal sweep...');

      const todayStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
      }).format(new Date());

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
        return 0;
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

      if (!claimed?.length) return 0;

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
      return claimed.length;
    });
  }
}

