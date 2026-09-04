import { randomUUID } from 'crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { CashfreeService } from '@/core/cashfree/cashfree.service';
import { InvoiceService } from '@/modules/billing/services/invoice.service';
import { NotificationsService } from '@/modules/notifications/services/notifications.service';
import { EmailService } from '@/core/email/email.service';
import { AppointmentsService } from '@/modules/appointments/services/appointments.service';
import {
  Appointment,
  AppointmentStatus,
} from '@/shared/interfaces/appointment.interface';
import { ProfileRole } from '@/shared/interfaces/profile.interface';
import { AuthUser } from '@/core/decorators/current-user.decorator';
import { ERROR_MESSAGES, ERROR_CODES } from '@/core/constants/errors.constant';
import {
  RecordChargeDto,
  RequestPayoutDto,
} from '@/modules/billing/controllers/billing.controller';
import { DecimalMath } from '@/core/utils/decimal.util';
import { CommissionCalculator } from '@/core/utils/commission.util';
import { CommissionService } from '@/core/commission/commission.service';
import { FXRateService } from '@/core/fx/fx-rate.service';
import {
  resolveCountryCurrency,
  extractPricingLock,
} from '@/core/utils/currency-resolver.util';

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
    private readonly commissionService: CommissionService,
  ) { }

  private async withNames(payments: any[]) {
    if (!payments.length) return [];
    const ids = [
      ...new Set(
        payments.flatMap((p) => [p.patient_id, p.doctor_id]).filter(Boolean),
      ),
    ];
    const { data: profiles } = await this.supabase.admin
      .from('profiles')
      .select('id, full_name')
      .in('id', ids);
    const nameById = new Map((profiles || []).map((p) => [p.id, p.full_name]));
    return payments.map((p) => ({
      ...p,
      patientName: nameById.get(p.patient_id) || 'Patient',
      doctorName: p.doctor_id ? nameById.get(p.doctor_id) || 'Doctor' : null,
    }));
  }

  async getTransactions(user: AuthUser) {
    const col =
      user.profile.role === ProfileRole.DOCTOR ? 'doctor_id' : 'patient_id';
    const { data } = await this.supabase.admin
      .from('payments')
      .select()
      .eq(col, user.id)
      .order('created_at', { ascending: false });
    return this.withNames(data || []);
  }

  async getTransaction(user: AuthUser, id: string) {
    const { data: payment } = await this.supabase.admin
      .from('payments')
      .select()
      .eq('id', id)
      .maybeSingle();
    if (!payment) throw new NotFoundException(ERROR_MESSAGES.PAYMENT_NOT_FOUND);
    if (payment.patient_id !== user.id && payment.doctor_id !== user.id)
      throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    return (await this.withNames([payment]))[0];
  }

  async getInvoicePdf(user: AuthUser, id: string) {
    const payment = await this.getTransaction(user, id);
    const pdf = await this.invoices.generatePdf(payment);
    return {
      pdf,
      filename: `invoice-${payment.txn_ref || String(payment.id).slice(0, 8)}.pdf`,
    };
  }

  private sumAmounts(rows: any[]): number {
    return DecimalMath.sum((rows || []).map((r) => r.amount || 0));
  }

  /** What a doctor can actually request as a payout in their currency */
  private async getAvailableBalance(doctorId: string): Promise<number> {
    const { data: docProfile } = await this.supabase.admin
      .from('profiles')
      .select('currency, country')
      .eq('id', doctorId)
      .maybeSingle();
    const docCurrency = resolveCountryCurrency(docProfile?.currency || docProfile?.country).currency;

    const [{ data: paid }, { data: outgoing }] = await Promise.all([
      this.supabase.admin
        .from('payments')
        .select('amount, currency, base_amount, base_currency, doctor_payout_amount, doctor_payout_currency, provider_payout_amount, provider_payout_currency')
        .eq('doctor_id', doctorId)
        .eq('status', 'Paid'),
      this.supabase.admin
        .from('payouts')
        .select('amount, currency')
        .eq('doctor_id', doctorId)
        .in('status', ['Processing', 'Paid']),
    ]);

    // Sum strictly in doctor operating currency to avoid cross-currency mathematical pollution
    const matchingPaid = (paid || []).filter((p) => {
      const payCurr = (p.doctor_payout_currency || p.provider_payout_currency || p.base_currency || p.currency || 'INR').toUpperCase();
      return payCurr === docCurrency;
    });
    const matchingOutgoing = (outgoing || []).filter(
      (p) => (p.currency || 'INR').toUpperCase() === docCurrency,
    );

    const totalEarned = DecimalMath.sum(
      matchingPaid.map((p) => p.doctor_payout_amount ?? p.provider_payout_amount ?? p.base_amount ?? p.amount ?? 0),
    );
    const totalOut = DecimalMath.sum(
      matchingOutgoing.map((p) => p.amount || 0),
    );
    return Math.max(0, DecimalMath.subtract(totalEarned, totalOut));
  }

  async getEarningsSummary(user: AuthUser) {
    if (user.profile.role !== ProfileRole.DOCTOR)
      throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);

    const docCurrency = resolveCountryCurrency(user.profile.currency || user.profile.country).currency;

    const [{ data: paid }, { data: pending }, { data: outgoing }] =
      await Promise.all([
        this.supabase.admin
          .from('payments')
          .select('amount, currency, base_amount, base_currency, doctor_payout_amount, doctor_payout_currency, provider_payout_amount, provider_payout_currency, created_at')
          .eq('doctor_id', user.id)
          .eq('status', 'Paid'),
        this.supabase.admin
          .from('payments')
          .select('amount, currency, base_amount, base_currency, doctor_payout_amount, doctor_payout_currency, provider_payout_amount, provider_payout_currency')
          .eq('doctor_id', user.id)
          .eq('status', 'Pending'),
        this.supabase.admin
          .from('payouts')
          .select('amount, currency')
          .eq('doctor_id', user.id)
          .in('status', ['Processing', 'Paid']),
      ]);

    const matchingPaid = (paid || []).filter((p) => {
      const payCurr = (p.doctor_payout_currency || p.provider_payout_currency || p.base_currency || p.currency || 'INR').toUpperCase();
      return payCurr === docCurrency;
    });
    const matchingPending = (pending || []).filter((p) => {
      const payCurr = (p.doctor_payout_currency || p.provider_payout_currency || p.base_currency || p.currency || 'INR').toUpperCase();
      return payCurr === docCurrency;
    });
    const matchingOutgoing = (outgoing || []).filter(
      (p) => (p.currency || 'INR').toUpperCase() === docCurrency,
    );

    const totalEarned = DecimalMath.sum(
      matchingPaid.map((p) => p.doctor_payout_amount ?? p.provider_payout_amount ?? p.base_amount ?? p.amount ?? 0),
    );
    const totalOut = DecimalMath.sum(matchingOutgoing.map((p) => p.amount || 0));
    const available = Math.max(0, DecimalMath.subtract(totalEarned, totalOut));

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    /** Sum earnings from the doctor's payout layer, then fall back to base (service) amount */
    const sumEarned = (rows: any[]) =>
      DecimalMath.sum(
        rows.map((r) => r.doctor_payout_amount ?? r.provider_payout_amount ?? r.base_amount ?? r.amount ?? 0),
      );
    const rows = matchingPaid;

    return {
      thisMonth: sumEarned(
        rows.filter((r) => new Date(r.created_at) >= startOfMonth),
      ),
      thisMonthCount: rows.filter((r) => new Date(r.created_at) >= startOfMonth)
        .length,
      lastMonth: sumEarned(
        rows.filter(
          (r) =>
            new Date(r.created_at) >= startOfLastMonth &&
            new Date(r.created_at) < startOfMonth,
        ),
      ),
      lastMonthCount: rows.filter(
        (r) =>
          new Date(r.created_at) >= startOfLastMonth &&
          new Date(r.created_at) < startOfMonth,
      ).length,
      pending: sumEarned(matchingPending),
      pendingCount: matchingPending.length,
      totalYtd: sumEarned(
        rows.filter((r) => new Date(r.created_at) >= startOfYear),
      ),
      available,
      currency: docCurrency,
    };
  }

  /**
   * Step 1: Creates a multi-currency payment order with immutable original amounts
   * and transaction-time FX conversion metadata
   */
  async createPaymentOrder(user: AuthUser, appointmentId: string) {
    if (user.profile.role !== ProfileRole.PATIENT)
      throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);

    const { data: appointment } = await this.supabase.admin
      .from('appointments')
      .select()
      .is('deleted_at', null)
      .eq('id', appointmentId)
      .eq('patient_id', user.id)
      .maybeSingle();
    if (!appointment)
      throw new NotFoundException(ERROR_MESSAGES.APPOINTMENT_NOT_FOUND);

    // Business Rule: Appointment must be accepted by doctor (Approved) before payment
    if (appointment.status === AppointmentStatus.REQUESTED) {
      throw new BadRequestException(
        'Please wait for the doctor to review and accept your appointment request before completing payment.',
      );
    }
    if (
      appointment.status !== AppointmentStatus.APPROVED &&
      appointment.status !== AppointmentStatus.HOLD
    ) {
      throw new BadRequestException(
        `Cannot initiate payment for an appointment that is already ${appointment.status.toLowerCase()}.`,
      );
    }

    const { data: doctor } = await this.supabase.admin
      .from('profiles')
      .select('consultation_fee, currency, country, commission_rate')
      .eq('id', appointment.doctor_id)
      .maybeSingle();

    // ── 1. Resolve Locked Pricing or Compute Real Conversion ─────────
    const pricingLock = extractPricingLock(appointment);

    let doctorBaseFee: number;
    let doctorCurrency: string;
    let patientPayableAmount: number;
    let patientCurrency: string;
    let exchangeRate = 1.0;
    let fxRateSource = 'healnari_treasury_matrix_v1';
    let fxRateTimestamp = new Date().toISOString();

    if (pricingLock) {
      doctorBaseFee = pricingLock.base_fee_amount;
      doctorCurrency = pricingLock.base_fee_currency;
      patientPayableAmount = pricingLock.patient_payable_amount;
      patientCurrency = pricingLock.patient_payable_currency;
      exchangeRate = pricingLock.exchange_rate;
      fxRateSource = pricingLock.exchange_rate_source;
      fxRateTimestamp = pricingLock.exchange_rate_timestamp;
    } else {
      // Backward compatibility for pre-migration appointments
      const docResolved = resolveCountryCurrency(doctor?.currency || doctor?.country);
      doctorCurrency = docResolved.currency;
      doctorBaseFee = Number(appointment.fee || doctor?.consultation_fee || (doctorCurrency === 'INR' ? 799 : 29));

      const patResolved = resolveCountryCurrency(appointment.country || user.profile?.country);
      patientCurrency = patResolved.currency;

      if (doctorCurrency !== patientCurrency) {
        const quote = this.fxRateService.getExchangeRate(doctorCurrency, patientCurrency);
        exchangeRate = quote.rate;
        fxRateSource = quote.source;
        fxRateTimestamp = quote.timestamp;
        patientPayableAmount = this.fxRateService.roundAmount(doctorBaseFee * exchangeRate, patientCurrency);
      } else {
        patientPayableAmount = this.fxRateService.roundAmount(doctorBaseFee, patientCurrency);
      }
    }

    // Idempotency guard: prevent duplicate orders for already-settled appointment
    const { data: alreadyPaid } = await this.supabase.admin
      .from('payments')
      .select()
      .eq('appointment_id', appointment.id)
      .eq('status', 'Paid')
      .maybeSingle();
    if (alreadyPaid)
      return {
        alreadyPaid: true,
        payment: (await this.withNames([alreadyPaid]))[0],
      };

    const { data: pending } = await this.supabase.admin
      .from('payments')
      .select()
      .eq('appointment_id', appointment.id)
      .eq('status', 'Pending')
      .maybeSingle();

    // ── 2. Calculate Commission & Payout in Doctor Base Currency (Doctor Payout Currency) ──
    const commissionRate = await this.commissionService.getGlobalCommissionRate();
    const payoutInDoctorCurr = this.commissionService.calculatePayout(doctorBaseFee, commissionRate);

    // ── 3. Normalized USD Reporting Layer (Immutable Snapshot) ────────
    const fxQuoteUsd = this.fxRateService.convertAmount(patientPayableAmount, patientCurrency, 'USD');

    const cfOrderId = `hn-${randomUUID()}`;
    const apiBase = (process.env.API_PUBLIC_URL || '').replace(/\/$/, '');
    const frontendBase = (process.env.FRONTEND_URL || '').replace(/\/$/, '');

    const order = await this.cashfree.createOrder({
      orderId: cfOrderId,
      amount: patientPayableAmount,
      currency: patientCurrency,
      customerId: user.id,
      customerName: user.profile.full_name || 'Patient',
      customerEmail: user.email,
      customerPhone: user.profile.phone,
      notifyUrl: apiBase
        ? `${apiBase}/api/billing/webhook/cashfree`
        : undefined,
      returnUrl: frontendBase
        ? `${frontendBase}/patient-dashboard/billing?cf_order_id=${cfOrderId}`
        : undefined,
      note: appointment.type === 'video' ? 'Video Consult' : 'Clinic Visit',
    });

    const row = {
      patient_id: user.id,
      doctor_id: appointment.doctor_id,
      appointment_id: appointment.id,
      service: appointment.type === 'video' ? 'Video Consult' : 'Clinic Visit',
      category: appointment.specialty,

      // 1. Patient Gateway Charge
      paid_amount: patientPayableAmount,
      paid_currency: patientCurrency,
      amount: patientPayableAmount,
      currency: patientCurrency,

      // 2. Doctor Base Service Price (Source)
      base_amount: doctorBaseFee,
      base_currency: doctorCurrency,
      original_amount: doctorBaseFee,
      original_currency: doctorCurrency,

      // 3. Locked Exchange Rate Metadata
      fx_rate: exchangeRate,
      fx_rate_source: fxRateSource,
      fx_rate_timestamp: fxRateTimestamp,

      // 4. Normalized USD Reporting
      reporting_amount: fxQuoteUsd.convertedAmount,
      reporting_currency: fxQuoteUsd.convertedCurrency,

      // 5. Doctor Earnings & Platform Fee in Doctor Operating Currency (NO currency mixing!)
      commission_rate: payoutInDoctorCurr.commissionRate,
      platform_fee_amount: payoutInDoctorCurr.commissionAmount,
      platform_fee_currency: doctorCurrency,
      provider_payout_amount: payoutInDoctorCurr.providerPayoutAmount,
      provider_payout_currency: doctorCurrency,

      status: 'Pending',
      cf_order_id: cfOrderId,
    };

    const { data: saved, error } = pending
      ? await this.supabase.admin
        .from('payments')
        .update(row)
        .eq('id', pending.id)
        .select()
        .maybeSingle()
      : await this.supabase.admin
        .from('payments')
        .insert(row)
        .select()
        .maybeSingle();

    if (error || !saved) {
      throw new InternalServerErrorException(
        `Database error during payment creation: ${error?.message || 'Unknown error'}.`,
      );
    }

    return {
      orderId: cfOrderId,
      paymentSessionId: order.payment_session_id,
      amount: patientPayableAmount,
      currency: patientCurrency,
      paymentId: saved.id,
    };
  }

  async getStatusForUser(user: AuthUser, cfOrderId: string) {
    const { data: payment } = await this.supabase.admin
      .from('payments')
      .select('patient_id')
      .eq('cf_order_id', cfOrderId)
      .maybeSingle();
    if (!payment) throw new NotFoundException(ERROR_MESSAGES.PAYMENT_NOT_FOUND);
    if (payment.patient_id !== user.id)
      throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    return this.reconcileCashfreeOrder(cfOrderId);
  }

  /**
   * Reconciles payment status against gateway with amount and currency consistency checks
   */
  async reconcileCashfreeOrder(cfOrderId: string) {
    const { data: payment } = await this.supabase.admin
      .from('payments')
      .select()
      .eq('cf_order_id', cfOrderId)
      .maybeSingle();
    if (!payment) return null;

    if (payment.status === 'Paid') return (await this.withNames([payment]))[0];

    const order = await this.cashfree.getOrder(cfOrderId);

    if (order.order_status === 'PAID') {
      // Gateway consistency verification
      const gatewayAmount = Number(order.order_amount || 0);
      const gatewayCurrency = String(
        order.order_currency || 'INR',
      ).toUpperCase();
      const expectedAmount = Number(
        payment.paid_amount ?? payment.amount ?? 0,
      );
      const expectedCurrency = String(
        payment.paid_currency || payment.currency || 'INR',
      ).toUpperCase();

      if (
        gatewayAmount !== expectedAmount ||
        gatewayCurrency !== expectedCurrency
      ) {
        this.logger.error(
          `Gateway discrepancy on ${cfOrderId}: Expected ${expectedAmount} ${expectedCurrency}, got ${gatewayAmount} ${gatewayCurrency}`,
        );
        // Strict security rule: Mark Disputed, log security alert, and reject auto-settlement
        const { data: disputed } = await this.supabase.admin
          .from('payments')
          .update({
            status: 'Disputed',
            txn_ref: `FLAGGED_MISMATCH_${cfOrderId}`,
          })
          .eq('id', payment.id)
          .select()
          .maybeSingle();

        return (await this.withNames([disputed || payment]))[0];
      }

      const attempts = await this.cashfree.getOrderPayments(cfOrderId);
      const successful = attempts.find(
        (p: any) => p.payment_status === 'SUCCESS',
      );
      const channel = successful?.payment_method
        ? Object.keys(successful.payment_method)[0]
        : null;

      // Update payment record upon settlement
      const { data: updated } = await this.supabase.admin
        .from('payments')
        .update({
          status: 'Paid',
          method: channel ? CHANNEL_LABELS[channel] || channel : 'Cashfree',
          txn_ref: successful?.cf_payment_id
            ? String(successful.cf_payment_id)
            : cfOrderId,
          cf_payment_id: successful?.cf_payment_id
            ? String(successful.cf_payment_id)
            : null,
          fx_rate_timestamp: new Date().toISOString(),
        })
        .eq('id', payment.id)
        .neq('status', 'Paid')
        .select()
        .maybeSingle();

      const currentPayment = updated || payment;
      const named = (await this.withNames([currentPayment]))[0];

      // Appointment synchronization (safe to run idempotently on webhook retry)
      const { data: appointment } = await this.supabase.admin
        .from('appointments')
        .select()
        .eq('id', currentPayment.appointment_id)
        .maybeSingle();
      if (appointment) {
        await this.supabase.admin
          .from('appointments')
          .update({ payment_id: currentPayment.id })
          .eq('id', currentPayment.appointment_id);

        if (
          appointment.status === 'Cancelled' ||
          appointment.status === 'No Show'
        ) {
          await this.appointmentsService.initiateRefundIfPaid({
            ...appointment,
            patientName: named.patientName,
          });
          this.logger.warn(
            `Payment settled for cancelled appointment ${appointment.id}. Automatic refund initiated.`,
          );
        } else {
          await this.appointmentsService.confirmPaidAppointment(
            currentPayment.appointment_id,
          );
        }
      }

      // Non-idempotent side effects (e.g. email receipts) should only run the first time
      if (updated) {
        this.onPaymentSettled(named).catch((err) =>
          this.logger.warn(
            `Post-payment side effects failed for ${updated.id}: ${err.message}`,
          ),
        );
      }
      return named;
    }

    if (
      order.order_status === 'EXPIRED' ||
      order.order_status === 'TERMINATED'
    ) {
      const { data: updated } = await this.supabase.admin
        .from('payments')
        .update({ status: 'Failed' })
        .eq('id', payment.id)
        .select()
        .maybeSingle();
      return (await this.withNames([updated]))[0];
    }

    return (await this.withNames([payment]))[0];
  }

  private formatAmountWithCurrency(
    amount: number | string,
    currency = 'INR',
  ): string {
    const num = DecimalMath.formatFixed(amount, 2);
    switch (currency.toUpperCase()) {
      case 'INR':
        return `₹${num}`;
      case 'USD':
        return `$${num}`;
      default:
        return (currency || 'INR').toUpperCase() === 'USD' ? `$${num}` : `₹${num}`;
    }
  }

  private async onPaymentSettled(payment: any) {
    const formattedAmount = this.formatAmountWithCurrency(
      payment.paid_amount ?? payment.original_amount ?? payment.amount,
      payment.paid_currency || payment.original_currency || payment.currency || 'INR',
    );

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
    const { data: patient } = await this.supabase.admin
      .from('profiles')
      .select('email')
      .eq('id', payment.patient_id)
      .maybeSingle();
    if (!patient?.email) return;

    const pdf = await this.invoices.generatePdf(payment);
    await this.email.sendTemplateEmail({
      templateKey: 'payment_receipt',
      to: patient.email,
      variables: {
        patientName: payment.patientName || 'there',
        amount: formattedAmount,
        service: payment.service,
        doctorName: payment.doctorName || 'Specialist',
        doctorInfo: payment.doctorName ? ` with Dr. ${payment.doctorName}` : '',
        invoiceUrl: this.email.getUrl('/patient-dashboard/billing'),
      },
      attachments: [
        {
          filename: `invoice-${payment.txn_ref || String(payment.id).slice(0, 8)}.pdf`,
          content: pdf,
          contentType: 'application/pdf',
        },
      ],
      entityType: 'payment',
      entityId: payment.id,
      event: 'payment_receipt_generated',
    });
  }

  async recordCharge(user: AuthUser, body: RecordChargeDto) {
    if (user.profile.role !== ProfileRole.DOCTOR)
      throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    if (!user.profile.kyc_verified)
      throw new ForbiddenException(ERROR_MESSAGES.DOCTOR_NOT_VERIFIED);

    const { data: patient } = await this.supabase.admin
      .from('profiles')
      .select()
      .eq('id', body.patientId)
      .eq('role', ProfileRole.PATIENT)
      .maybeSingle();
    if (!patient) throw new NotFoundException(ERROR_MESSAGES.PATIENT_NOT_FOUND);

    const amount = Number(body.amount);
    const currency = (user.profile.currency || 'INR').toUpperCase();

    // ── Centralized dynamic global commission (single source of truth from DB) ──
    const commissionRate = await this.commissionService.getGlobalCommissionRate();
    const payout = this.commissionService.calculatePayout(amount, commissionRate);
    const fxQuote = this.fxRateService.convertAmount(amount, currency, 'USD');

    const txnRef =
      body.status === 'Paid'
        ? `TXN-${Math.floor(Math.random() * 900000 + 100000)}`
        : null;
    const { data: created } = await this.supabase.admin
      .from('payments')
      .insert({
        patient_id: body.patientId,
        doctor_id: user.id,
        service: body.service,
        category: body.category,

        paid_amount: amount,
        paid_currency: currency,
        amount,
        currency,
        base_amount: amount,
        base_currency: currency,
        original_amount: amount,
        original_currency: currency,

        reporting_amount: fxQuote.convertedAmount,
        reporting_currency: fxQuote.convertedCurrency,
        fx_rate: fxQuote.fxRate,
        fx_rate_source: fxQuote.fxRateSource,
        fx_rate_timestamp: fxQuote.fxRateTimestamp,

        commission_rate: payout.commissionRate,
        platform_fee_amount: payout.commissionAmount,
        platform_fee_currency: currency,
        provider_payout_amount: payout.providerPayoutAmount,
        provider_payout_currency: currency,

        status: body.status,
        method: body.method,
        txn_ref: txnRef,
      })
      .select()
      .maybeSingle();

    return (await this.withNames([created]))[0];
  }

  async getPayouts(user: AuthUser) {
    if (user.profile.role !== ProfileRole.DOCTOR)
      throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    const { data } = await this.supabase.admin
      .from('payouts')
      .select()
      .eq('doctor_id', user.id)
      .order('requested_at', { ascending: false });
    return data || [];
  }

  async requestPayout(user: AuthUser, body: RequestPayoutDto) {
    if (user.profile.role !== ProfileRole.DOCTOR)
      throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);

    if (user.profile.status === 'Suspended') {
      throw new ForbiddenException('Suspended doctors cannot request payouts.');
    }

    // ── 1. Strict Idempotency Check ─────────────────────────────────
    if (body.idempotencyKey) {
      const { data: existing } = await this.supabase.admin
        .from('payouts')
        .select()
        .eq('doctor_id', user.id)
        .eq('idempotency_key', body.idempotencyKey)
        .maybeSingle();

      if (existing) {
        this.logger.log(
          `Idempotent payout hit for doctor ${user.id}, returning existing payout ${existing.id}`,
        );
        return existing;
      }
    }

    const amount = Number(body.amount);
    if (!(amount > 0))
      throw new BadRequestException(ERROR_MESSAGES.NOTHING_TO_CHARGE);

    const available = await this.getAvailableBalance(user.id);
    if (amount > available)
      throw new BadRequestException(ERROR_MESSAGES.INSUFFICIENT_BALANCE);

    const rawMethod = String(body.method || 'Bank Account').trim();
    const method = rawMethod.toLowerCase().includes('upi')
      ? 'UPI'
      : rawMethod.toLowerCase().includes('wallet')
        ? 'Wallet'
        : 'Bank Account';

    const idempotencyKey = body.idempotencyKey || `hn-po-${randomUUID()}`;
    const destinationDetails = body.destinationDetails || {
      method,
      account_holder: user.profile.full_name || 'Doctor',
      phone: user.profile.phone || null,
      email: user.email || null,
      timestamp: new Date().toISOString(),
    };

    const currency = (user.profile.currency || 'INR').toUpperCase() === 'USD' ? 'USD' : 'INR';
    const { data, error } = await this.supabase.admin
      .from('payouts')
      .insert({
        doctor_id: user.id,
        amount,
        currency,
        original_amount: amount,
        original_currency: currency,
        method,
        status: 'Processing',
        idempotency_key: idempotencyKey,
        destination_details: destinationDetails,
      })
      .select()
      .maybeSingle();

    if (error) {
      if (error.code === '23505') {
        // Unique constraint violation on idempotency_key
        const { data: existing } = await this.supabase.admin
          .from('payouts')
          .select()
          .eq('idempotency_key', idempotencyKey)
          .maybeSingle();
        if (existing) return existing;
      }
      this.logger.error(
        `Failed to create payout for doctor ${user.id}: ${error.message}`,
        error,
      );
      throw new InternalServerErrorException({
        message: ERROR_MESSAGES.PAYOUT_FAILED,
        errorCode: ERROR_CODES.PAYOUT_PROCESSING_FAILED,
      });
    }

    return data;
  }
}
