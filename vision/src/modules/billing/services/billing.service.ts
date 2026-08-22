import { randomUUID } from 'crypto';
import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { CashfreeService } from '@/core/cashfree/cashfree.service';
import { InvoiceService } from '@/modules/billing/services/invoice.service';
import { NotificationsService } from '@/modules/notifications/services/notifications.service';
import { EmailService } from '@/core/email/email.service';
import { AppointmentsService } from '@/modules/appointments/services/appointments.service';
import { ProfileRole } from '@/shared/interfaces/profile.interface';
import { AuthUser } from '@/core/decorators/current-user.decorator';
import { ERROR_MESSAGES } from '@/core/constants/errors.constant';
import { RecordChargeDto, RequestPayoutDto } from '@/modules/billing/controllers/billing.controller';
import { DecimalMath } from '@/core/utils/decimal.util';
import { FXRateService } from '@/core/fx/fx-rate.service';

const CHANNEL_LABELS: Record<string, string> = {
  upi: 'UPI',
  card: 'Card',
  netbanking: 'Net Banking',
  app: 'Wallet',
  paylater: 'Pay Later',
  emi: 'EMI',
  cardless_emi: 'Cardless EMI',
};

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly cashfree: CashfreeService,
    private readonly invoices: InvoiceService,
    private readonly notifications: NotificationsService,
    private readonly email: EmailService,
    private readonly appointmentsService: AppointmentsService,
    private readonly fxRateService: FXRateService,
  ) { }

  private async withNames(payments: any[]) {
    if (!payments.length) return [];
    const ids = [...new Set(payments.flatMap(p => [p.patient_id, p.doctor_id]).filter(Boolean))];
    const { data: profiles } = await this.supabase.admin.from('profiles').select('id, full_name').in('id', ids);
    const nameById = new Map((profiles || []).map(p => [p.id, p.full_name]));
    return payments.map(p => ({
      ...p,
      patientName: nameById.get(p.patient_id) || 'Patient',
      doctorName: p.doctor_id ? (nameById.get(p.doctor_id) || 'Doctor') : null,
    }));
  }

  async getTransactions(user: AuthUser) {
    const col = user.profile.role === ProfileRole.DOCTOR ? 'doctor_id' : 'patient_id';
    const { data } = await this.supabase.admin.from('payments').select().eq(col, user.id).order('created_at', { ascending: false });
    return this.withNames(data || []);
  }

  async getTransaction(user: AuthUser, id: string) {
    const { data: payment } = await this.supabase.admin.from('payments').select().eq('id', id).single();
    if (!payment) throw new NotFoundException(ERROR_MESSAGES.PAYMENT_NOT_FOUND);
    if (payment.patient_id !== user.id && payment.doctor_id !== user.id) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    return (await this.withNames([payment]))[0];
  }

  async getInvoicePdf(user: AuthUser, id: string) {
    const payment = await this.getTransaction(user, id);
    const pdf = await this.invoices.generatePdf(payment);
    return { pdf, filename: `invoice-${payment.txn_ref || String(payment.id).slice(0, 8)}.pdf` };
  }

  private sumAmounts(rows: any[]): number {
    return DecimalMath.sum((rows || []).map(r => r.amount || 0));
  }

  /** What a doctor can actually request as a payout in their currency */
  private async getAvailableBalance(doctorId: string): Promise<number> {
    const [{ data: paid }, { data: outgoing }] = await Promise.all([
      this.supabase.admin.from('payments').select('amount, provider_payout_amount').eq('doctor_id', doctorId).eq('status', 'Paid'),
      this.supabase.admin.from('payouts').select('amount').eq('doctor_id', doctorId).in('status', ['Processing', 'Paid']),
    ]);
    
    // Sum provider_payout_amount (90% take rate) if populated, otherwise fallback to amount
    const totalEarned = DecimalMath.sum((paid || []).map(p => p.provider_payout_amount || p.amount || 0));
    const totalOut = DecimalMath.sum((outgoing || []).map(p => p.amount || 0));
    return Math.max(0, DecimalMath.subtract(totalEarned, totalOut));
  }

  async getEarningsSummary(user: AuthUser) {
    if (user.profile.role !== ProfileRole.DOCTOR) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);

    const [{ data: paid }, { data: pending }, { data: outgoing }] = await Promise.all([
      this.supabase.admin.from('payments').select('amount, provider_payout_amount, currency, created_at').eq('doctor_id', user.id).eq('status', 'Paid'),
      this.supabase.admin.from('payments').select('amount, provider_payout_amount, currency').eq('doctor_id', user.id).eq('status', 'Pending'),
      this.supabase.admin.from('payouts').select('amount, currency').eq('doctor_id', user.id).in('status', ['Processing', 'Paid']),
    ]);

    const totalEarned = DecimalMath.sum((paid || []).map(p => p.provider_payout_amount || p.amount || 0));
    const totalOut = DecimalMath.sum((outgoing || []).map(p => p.amount || 0));
    const available = Math.max(0, DecimalMath.subtract(totalEarned, totalOut));

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const sumEarned = (rows: any[]) => DecimalMath.sum(rows.map(r => r.provider_payout_amount || r.amount || 0));
    const rows = paid || [];

    return {
      thisMonth: sumEarned(rows.filter(r => new Date(r.created_at) >= startOfMonth)),
      thisMonthCount: rows.filter(r => new Date(r.created_at) >= startOfMonth).length,
      lastMonth: sumEarned(rows.filter(r => new Date(r.created_at) >= startOfLastMonth && new Date(r.created_at) < startOfMonth)),
      lastMonthCount: rows.filter(r => new Date(r.created_at) >= startOfLastMonth && new Date(r.created_at) < startOfMonth).length,
      pending: sumEarned(pending || []),
      pendingCount: (pending || []).length,
      totalYtd: sumEarned(rows.filter(r => new Date(r.created_at) >= startOfYear)),
      available,
      currency: user.profile.currency || 'INR',
    };
  }

  /**
   * Step 1: Creates a multi-currency payment order with immutable original amounts
   * and transaction-time FX conversion metadata
   */
  async createPaymentOrder(user: AuthUser, appointmentId: string) {
    if (user.profile.role !== ProfileRole.PATIENT) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);

    const { data: appointment } = await this.supabase.admin.from('appointments').select().is('deleted_at', null).eq('id', appointmentId).eq('patient_id', user.id).single();
    if (!appointment) throw new NotFoundException(ERROR_MESSAGES.APPOINTMENT_NOT_FOUND);

    const { data: doctor } = await this.supabase.admin.from('profiles').select('consultation_fee, currency, commission_rate').eq('id', appointment.doctor_id).single();
    const amount = Number(doctor?.consultation_fee || 0);
    if (amount <= 0) throw new BadRequestException(ERROR_MESSAGES.NOTHING_TO_CHARGE);
    const currency = (doctor?.currency || 'INR').toUpperCase();
    const commissionRate = Number(doctor?.commission_rate || 10); // 10% platform fee default

    // Idempotency guard: prevent duplicate orders for already-settled appointment
    const { data: alreadyPaid } = await this.supabase.admin.from('payments').select().eq('appointment_id', appointment.id).eq('status', 'Paid').single();
    if (alreadyPaid) return { alreadyPaid: true, payment: (await this.withNames([alreadyPaid]))[0] };

    const { data: pending } = await this.supabase.admin.from('payments').select().eq('appointment_id', appointment.id).eq('status', 'Pending').single();

    // Financial revenue segregation (Fixed Decimal Math)
    const platformFee = DecimalMath.percentage(amount, commissionRate);
    const providerPayout = DecimalMath.subtract(amount, platformFee);

    // Capture transaction-time FX conversion
    const fxQuote = this.fxRateService.convert(amount, currency, 'USD');

    const cfOrderId = `hn-${randomUUID()}`;
    const apiBase = (process.env.API_PUBLIC_URL || '').replace(/\/$/, '');
    const frontendBase = (process.env.FRONTEND_URL || '').replace(/\/$/, '');

    const order = await this.cashfree.createOrder({
      orderId: cfOrderId,
      amount,
      currency,
      customerId: user.id,
      customerName: user.profile.full_name || 'Patient',
      customerEmail: user.email,
      customerPhone: user.profile.phone,
      notifyUrl: apiBase ? `${apiBase}/api/billing/webhook/cashfree` : undefined,
      returnUrl: frontendBase ? `${frontendBase}/patient-dashboard/billing?cf_order_id=${cfOrderId}` : undefined,
      note: appointment.type === 'video' ? 'Video Consult' : 'Clinic Visit',
    });

    const row = {
      patient_id: user.id,
      doctor_id: appointment.doctor_id,
      appointment_id: appointment.id,
      service: appointment.type === 'video' ? 'Video Consult' : 'Clinic Visit',
      category: appointment.specialty,
      
      // Original Financial Transaction (Immutable)
      amount,
      currency,
      original_amount: amount,
      original_currency: currency,

      // Normalized Reporting Layer
      reporting_amount: fxQuote.reportingAmount,
      reporting_currency: fxQuote.reportingCurrency,
      fx_rate: fxQuote.fxRate,
      fx_rate_source: fxQuote.fxRateSource,
      fx_rate_timestamp: fxQuote.fxRateTimestamp,

      // Revenue Segregation
      platform_fee_amount: platformFee,
      platform_fee_currency: currency,
      provider_payout_amount: providerPayout,
      provider_payout_currency: currency,

      status: 'Pending',
      cf_order_id: cfOrderId,
    };

    const { data: saved, error } = pending
      ? await this.supabase.admin.from('payments').update(row).eq('id', pending.id).select().single()
      : await this.supabase.admin.from('payments').insert(row).select().single();

    if (error || !saved) {
      throw new InternalServerErrorException(
        `Database error during payment creation: ${error?.message || 'Unknown error'}.`
      );
    }

    return { orderId: cfOrderId, paymentSessionId: order.payment_session_id, amount, currency, paymentId: saved.id };
  }

  async getStatusForUser(user: AuthUser, cfOrderId: string) {
    const { data: payment } = await this.supabase.admin.from('payments').select('patient_id').eq('cf_order_id', cfOrderId).single();
    if (!payment) throw new NotFoundException(ERROR_MESSAGES.PAYMENT_NOT_FOUND);
    if (payment.patient_id !== user.id) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    return this.reconcileCashfreeOrder(cfOrderId);
  }

  /**
   * Reconciles payment status against gateway with amount and currency consistency checks
   */
  async reconcileCashfreeOrder(cfOrderId: string) {
    const { data: payment } = await this.supabase.admin.from('payments').select().eq('cf_order_id', cfOrderId).single();
    if (!payment) return null;

    if (payment.status === 'Paid') return (await this.withNames([payment]))[0];

    const order = await this.cashfree.getOrder(cfOrderId);

    if (order.order_status === 'PAID') {
      // Gateway consistency verification
      const gatewayAmount = Number(order.order_amount || 0);
      const gatewayCurrency = String(order.order_currency || 'INR').toUpperCase();
      const expectedAmount = Number(payment.original_amount || payment.amount);
      const expectedCurrency = String(payment.original_currency || payment.currency).toUpperCase();

      if (gatewayAmount !== expectedAmount || gatewayCurrency !== expectedCurrency) {
        this.logger.error(`Gateway discrepancy on ${cfOrderId}: Expected ${expectedAmount} ${expectedCurrency}, got ${gatewayAmount} ${gatewayCurrency}`);
      }

      const attempts = await this.cashfree.getOrderPayments(cfOrderId);
      const successful = attempts.find((p: any) => p.payment_status === 'SUCCESS');
      const channel = successful?.payment_method ? Object.keys(successful.payment_method)[0] : null;

      // Update payment record upon settlement
      const { data: updated } = await this.supabase.admin.from('payments').update({
        status: 'Paid',
        method: channel ? (CHANNEL_LABELS[channel] || channel) : 'Cashfree',
        txn_ref: successful?.cf_payment_id ? String(successful.cf_payment_id) : cfOrderId,
        cf_payment_id: successful?.cf_payment_id ? String(successful.cf_payment_id) : null,
        fx_rate_timestamp: new Date().toISOString(),
      }).eq('id', payment.id).select().single();

      const named = (await this.withNames([updated]))[0];

      // Appointment synchronization
      const { data: appointment } = await this.supabase.admin.from('appointments').select().eq('id', payment.appointment_id).single();
      if (appointment) {
        await this.supabase.admin.from('appointments').update({ payment_id: payment.id }).eq('id', payment.appointment_id);
      }

      if (appointment?.status === 'Cancelled' || appointment?.status === 'No Show') {
        await this.appointmentsService.initiateRefundIfPaid({ ...appointment, patientName: named.patientName });
        this.logger.warn(`Payment settled for cancelled appointment ${appointment.id}. Automatic refund initiated.`);
      } else {
        await this.appointmentsService.confirmPaidAppointment(payment.appointment_id);
      }

      this.onPaymentSettled(named).catch((err) => this.logger.warn(`Post-payment side effects failed for ${updated.id}: ${err.message}`));
      return named;
    }

    if (order.order_status === 'EXPIRED' || order.order_status === 'TERMINATED') {
      const { data: updated } = await this.supabase.admin.from('payments').update({ status: 'Failed' }).eq('id', payment.id).select().single();
      return (await this.withNames([updated]))[0];
    }

    return (await this.withNames([payment]))[0];
  }

  private formatAmountWithCurrency(amount: number | string, currency = 'INR'): string {
    const num = DecimalMath.formatFixed(amount, 2);
    switch (currency.toUpperCase()) {
      case 'INR': return `₹${num}`;
      case 'AED': return `AED ${num}`;
      case 'USD': return `$${num}`;
      case 'EUR': return `€${num}`;
      case 'GBP': return `£${num}`;
      default: return `${currency} ${num}`;
    }
  }

  private async onPaymentSettled(payment: any) {
    const formattedAmount = this.formatAmountWithCurrency(payment.original_amount || payment.amount, payment.original_currency || payment.currency || 'INR');

    this.notifications.create(payment.patient_id, {
      type: 'payment_success',
      title: 'Payment Successful',
      message: `${formattedAmount} paid for your ${payment.service}${payment.doctorName ? ` with Dr. ${payment.doctorName}` : ''}.`,
      data: { paymentId: payment.id, appointmentId: payment.appointment_id },
    });

    if (payment.doctor_id) {
      this.notifications.create(payment.doctor_id, {
        type: 'payment_received',
        title: 'Payment Received',
        message: `${formattedAmount} received from ${payment.patientName || 'a patient'} for ${payment.service}.`,
        data: { paymentId: payment.id, appointmentId: payment.appointment_id },
      });
    }

    if (!this.email.isConfigured) return;
    const { data: patient } = await this.supabase.admin.from('profiles').select('email').eq('id', payment.patient_id).single();
    if (!patient?.email) return;

    const pdf = await this.invoices.generatePdf(payment);
    await this.email.sendMail({
      to: patient.email,
      subject: `HealNari — Payment Receipt (${formattedAmount})`,
      html: `<p>Hi ${payment.patientName || 'there'},</p><p>We've received your payment of <strong>${formattedAmount}</strong> for <strong>${payment.service}</strong>${payment.doctorName ? ` with Dr. ${payment.doctorName}` : ''}.</p><p>Your invoice is attached as a PDF for your records.</p><p>— Team HealNari</p>`,
      text: `Hi ${payment.patientName || 'there'}, we've received your payment of ${formattedAmount} for ${payment.service}. Your invoice is attached.`,
      attachments: [{ filename: `invoice-${payment.txn_ref || String(payment.id).slice(0, 8)}.pdf`, content: pdf, contentType: 'application/pdf' }],
    });
  }

  async recordCharge(user: AuthUser, body: RecordChargeDto) {
    if (user.profile.role !== ProfileRole.DOCTOR) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    if (!user.profile.kyc_verified) throw new ForbiddenException(ERROR_MESSAGES.DOCTOR_NOT_VERIFIED);

    const { data: patient } = await this.supabase.admin.from('profiles').select().eq('id', body.patientId).eq('role', ProfileRole.PATIENT).single();
    if (!patient) throw new NotFoundException(ERROR_MESSAGES.PATIENT_NOT_FOUND);

    const amount = Number(body.amount);
    const currency = (user.profile.currency || 'INR').toUpperCase();
    const commissionRate = Number(user.profile.commission_rate || 10);

    const platformFee = DecimalMath.percentage(amount, commissionRate);
    const providerPayout = DecimalMath.subtract(amount, platformFee);
    const fxQuote = this.fxRateService.convert(amount, currency, 'USD');

    const txnRef = body.status === 'Paid' ? `TXN-${Math.floor(Math.random() * 900000 + 100000)}` : null;
    const { data: created } = await this.supabase.admin.from('payments').insert({
      patient_id: body.patientId,
      doctor_id: user.id,
      service: body.service,
      category: body.category,
      
      amount,
      currency,
      original_amount: amount,
      original_currency: currency,

      reporting_amount: fxQuote.reportingAmount,
      reporting_currency: fxQuote.reportingCurrency,
      fx_rate: fxQuote.fxRate,
      fx_rate_source: fxQuote.fxRateSource,
      fx_rate_timestamp: fxQuote.fxRateTimestamp,

      platform_fee_amount: platformFee,
      platform_fee_currency: currency,
      provider_payout_amount: providerPayout,
      provider_payout_currency: currency,

      status: body.status,
      method: body.method,
      txn_ref: txnRef,
    }).select().single();

    return (await this.withNames([created]))[0];
  }

  async getPayouts(user: AuthUser) {
    if (user.profile.role !== ProfileRole.DOCTOR) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    const { data } = await this.supabase.admin.from('payouts').select().eq('doctor_id', user.id).order('requested_at', { ascending: false });
    return data || [];
  }

  async requestPayout(user: AuthUser, body: RequestPayoutDto) {
    if (user.profile.role !== ProfileRole.DOCTOR) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);

    const amount = Number(body.amount);
    if (!(amount > 0)) throw new BadRequestException(ERROR_MESSAGES.NOTHING_TO_CHARGE);

    const available = await this.getAvailableBalance(user.id);
    if (amount > available) throw new BadRequestException(ERROR_MESSAGES.INSUFFICIENT_BALANCE);

    const currency = (user.profile.currency || 'INR').toUpperCase();
    const { data } = await this.supabase.admin.from('payouts').insert({
      doctor_id: user.id,
      amount,
      currency,
      original_amount: amount,
      original_currency: currency,
      method: body.method,
      status: 'Processing',
    }).select().single();
    return data;
  }
}
