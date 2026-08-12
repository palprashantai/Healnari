import { randomUUID } from 'crypto';
import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { CashfreeService } from '@/core/cashfree/cashfree.service';
import { InvoiceService } from '@/modules/billing/services/invoice.service';
import { NotificationsService } from '@/modules/notifications/services/notifications.service';
import { EmailService } from '@/core/email/email.service';
import { ProfileRole } from '@/shared/interfaces/profile.interface';
import { AuthUser } from '@/core/decorators/current-user.decorator';
import { ERROR_MESSAGES } from '@/core/constants/errors.constant';
import { RecordChargeDto, RequestPayoutDto } from '@/modules/billing/controllers/billing.controller';

// Cashfree's payment_method object is keyed by channel (upi/card/netbanking/
// app/...) — mapped to the labels the existing billing UI already renders
// icons for (see METHOD_ICON in Billing.jsx) instead of a raw channel key.
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

  /** What a doctor can actually request as a payout right now — total ever
   * collected from patients, minus whatever's already been paid out or is
   * sitting in an in-flight payout request. Failed payout attempts don't
   * count against it (the money never left, so it's still available). */
  private async getAvailableBalance(doctorId: string): Promise<number> {
    const { data: paid } = await this.supabase.admin.from('payments').select('amount').eq('doctor_id', doctorId).eq('status', 'Paid');
    const { data: outgoing } = await this.supabase.admin.from('payouts').select('amount').eq('doctor_id', doctorId).in('status', ['Processing', 'Paid']);
    const sum = (rows: any[]) => (rows || []).reduce((total, r) => total + Number(r.amount), 0);
    return Math.max(0, sum(paid || []) - sum(outgoing || []));
  }

  async getEarningsSummary(user: AuthUser) {
    if (user.profile.role !== ProfileRole.DOCTOR) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);

    const { data: paid } = await this.supabase.admin.from('payments').select('amount, created_at').eq('doctor_id', user.id).eq('status', 'Paid');
    const { data: pending } = await this.supabase.admin.from('payments').select('amount').eq('doctor_id', user.id).eq('status', 'Pending');
    const available = await this.getAvailableBalance(user.id);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const sum = (rows: any[]) => rows.reduce((total, r) => total + Number(r.amount), 0);
    const rows = paid || [];

    return {
      thisMonth: sum(rows.filter(r => new Date(r.created_at) >= startOfMonth)),
      thisMonthCount: rows.filter(r => new Date(r.created_at) >= startOfMonth).length,
      lastMonth: sum(rows.filter(r => new Date(r.created_at) >= startOfLastMonth && new Date(r.created_at) < startOfMonth)),
      lastMonthCount: rows.filter(r => new Date(r.created_at) >= startOfLastMonth && new Date(r.created_at) < startOfMonth).length,
      pending: sum(pending || []),
      pendingCount: (pending || []).length,
      totalYtd: sum(rows.filter(r => new Date(r.created_at) >= startOfYear)),
      available,
    };
  }

  /** Step 1 of a real payment — creates (or reuses) a Cashfree order for the
   * appointment's consultation fee and a matching 'Pending' payment row.
   * Nothing is marked paid here; that only ever happens in
   * reconcileCashfreeOrder(), driven by the webhook or the frontend's
   * post-checkout status poll — both of which re-verify with Cashfree
   * directly rather than trusting anything the client claims. */
  async createPaymentOrder(user: AuthUser, appointmentId: string) {
    if (user.profile.role !== ProfileRole.PATIENT) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);

    const { data: appointment } = await this.supabase.admin.from('appointments').select().eq('id', appointmentId).eq('patient_id', user.id).single();
    if (!appointment) throw new NotFoundException(ERROR_MESSAGES.APPOINTMENT_NOT_FOUND);

    const { data: doctor } = await this.supabase.admin.from('profiles').select('consultation_fee, currency').eq('id', appointment.doctor_id).single();
    const amount = Number(doctor?.consultation_fee || 0);
    if (amount <= 0) throw new BadRequestException(ERROR_MESSAGES.NOTHING_TO_CHARGE);
    const currency = doctor?.currency || 'INR';

    // Idempotency guard: a stale client (or a second tab) asking to pay for
    // an appointment that's already settled gets the existing receipt back
    // instead of a second Cashfree order.
    const { data: alreadyPaid } = await this.supabase.admin.from('payments').select().eq('appointment_id', appointment.id).eq('status', 'Paid').single();
    if (alreadyPaid) return { alreadyPaid: true, payment: (await this.withNames([alreadyPaid]))[0] };

    const { data: pending } = await this.supabase.admin.from('payments').select().eq('appointment_id', appointment.id).eq('status', 'Pending').single();

    // Cashfree order ids can't be reused across attempts (a previous Failed/
    // Expired attempt on this same appointment needs a fresh one).
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
      amount,
      currency,
      status: 'Pending',
      cf_order_id: cfOrderId,
    };

    const { data: saved, error } = pending
      ? await this.supabase.admin.from('payments').update(row).eq('id', pending.id).select().single()
      : await this.supabase.admin.from('payments').insert(row).select().single();

    if (error || !saved) {
      throw new InternalServerErrorException(
        `Database error during payment creation: ${error?.message || 'Unknown error'}. Did you forget to apply the database migrations?`
      );
    }

    return { orderId: cfOrderId, paymentSessionId: order.payment_session_id, amount, currency, paymentId: saved.id };
  }

  /** Authenticated wrapper around reconcileCashfreeOrder() — confirms the
   * order actually belongs to the caller before touching/returning it. */
  async getStatusForUser(user: AuthUser, cfOrderId: string) {
    const { data: payment } = await this.supabase.admin.from('payments').select('patient_id').eq('cf_order_id', cfOrderId).single();
    if (!payment) throw new NotFoundException(ERROR_MESSAGES.PAYMENT_NOT_FOUND);
    if (payment.patient_id !== user.id) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    return this.reconcileCashfreeOrder(cfOrderId);
  }

  /** The single place a payment is ever marked 'Paid' — always via a fresh
   * server-to-server call to Cashfree, regardless of what triggered this
   * (webhook delivery or the frontend's post-checkout poll), so neither path
   * can be spoofed into faking a successful payment. */
  async reconcileCashfreeOrder(cfOrderId: string) {
    const { data: payment } = await this.supabase.admin.from('payments').select().eq('cf_order_id', cfOrderId).single();
    if (!payment) return null; // unknown/foreign order — ignore

    if (payment.status === 'Paid') return (await this.withNames([payment]))[0];

    const order = await this.cashfree.getOrder(cfOrderId);

    if (order.order_status === 'PAID') {
      const attempts = await this.cashfree.getOrderPayments(cfOrderId);
      const successful = attempts.find((p: any) => p.payment_status === 'SUCCESS');
      const channel = successful?.payment_method ? Object.keys(successful.payment_method)[0] : null;
      const { data: updated } = await this.supabase.admin.from('payments').update({
        status: 'Paid',
        method: channel ? (CHANNEL_LABELS[channel] || channel) : 'Cashfree',
        txn_ref: successful?.cf_payment_id ? String(successful.cf_payment_id) : cfOrderId,
        cf_payment_id: successful?.cf_payment_id ? String(successful.cf_payment_id) : null,
      }).eq('id', payment.id).select().single();
      const named = (await this.withNames([updated]))[0];
      this.onPaymentSettled(named).catch((err) => this.logger.warn(`Post-payment side effects failed for ${updated.id}: ${err.message}`));
      return named;
    }

    if (order.order_status === 'EXPIRED' || order.order_status === 'TERMINATED') {
      const { data: updated } = await this.supabase.admin.from('payments').update({ status: 'Failed' }).eq('id', payment.id).select().single();
      return (await this.withNames([updated]))[0];
    }

    // Still ACTIVE — no completed attempt yet, leave it Pending.
    return (await this.withNames([payment]))[0];
  }

  /** Fired once, right after a payment settles to 'Paid' — in-app
   * notifications for both sides plus a receipt email with the PDF invoice
   * attached. Best-effort and never awaited by the caller: a slow SMTP
   * provider must not delay the payment-status response the frontend is
   * polling for. */
  private async onPaymentSettled(payment: any) {
    this.notifications.create(payment.patient_id, {
      type: 'payment_success',
      title: 'Payment Successful',
      message: `₹${Number(payment.amount).toFixed(0)} paid for your ${payment.service}${payment.doctorName ? ` with Dr. ${payment.doctorName}` : ''}.`,
      data: { paymentId: payment.id, appointmentId: payment.appointment_id },
    });

    if (payment.doctor_id) {
      this.notifications.create(payment.doctor_id, {
        type: 'payment_received',
        title: 'Payment Received',
        message: `₹${Number(payment.amount).toFixed(0)} received from ${payment.patientName || 'a patient'} for ${payment.service}.`,
        data: { paymentId: payment.id, appointmentId: payment.appointment_id },
      });
    }

    if (!this.email.isConfigured) return;
    const { data: patient } = await this.supabase.admin.from('profiles').select('email').eq('id', payment.patient_id).single();
    if (!patient?.email) return;

    const pdf = await this.invoices.generatePdf(payment);
    const amount = Number(payment.amount).toFixed(0);
    await this.email.sendMail({
      to: patient.email,
      subject: `HealNari — Payment Receipt (₹${amount})`,
      html: `<p>Hi ${payment.patientName || 'there'},</p><p>We've received your payment of <strong>₹${amount}</strong> for <strong>${payment.service}</strong>${payment.doctorName ? ` with Dr. ${payment.doctorName}` : ''}.</p><p>Your invoice is attached as a PDF for your records.</p><p>— Team HealNari</p>`,
      text: `Hi ${payment.patientName || 'there'}, we've received your payment of Rs.${amount} for ${payment.service}. Your invoice is attached.`,
      attachments: [{ filename: `invoice-${payment.txn_ref || String(payment.id).slice(0, 8)}.pdf`, content: pdf, contentType: 'application/pdf' }],
    });
  }

  /** Doctor-initiated charge — e.g. cash collected in-clinic for a service
   * with no linked appointment. Distinct from pay(), which is the
   * patient settling an existing appointment-linked payment. */
  async recordCharge(user: AuthUser, body: RecordChargeDto) {
    if (user.profile.role !== ProfileRole.DOCTOR) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);

    const { data: patient } = await this.supabase.admin.from('profiles').select().eq('id', body.patientId).eq('role', ProfileRole.PATIENT).single();
    if (!patient) throw new NotFoundException(ERROR_MESSAGES.PATIENT_NOT_FOUND);

    const txnRef = body.status === 'Paid' ? `TXN-${Math.floor(Math.random() * 900000 + 100000)}` : null;
    const { data: created } = await this.supabase.admin.from('payments').insert({
      patient_id: body.patientId,
      doctor_id: user.id,
      service: body.service,
      category: body.category,
      amount: body.amount,
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

    const { data } = await this.supabase.admin.from('payouts').insert({
      doctor_id: user.id,
      amount,
      method: body.method,
      status: 'Processing',
    }).select().single();
    return data;
  }
}
