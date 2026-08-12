import { BillingService } from '@/modules/billing/services/billing.service';
import { createSupabaseMock } from '@/test-utils/supabase-mock';

/**
 * AUDIT_REPORT.md OPS-1 — payment webhook idempotency. Cashfree can (and
 * does) deliver the same webhook more than once, and the frontend's
 * post-checkout status poll can race a webhook delivery for the same order.
 * reconcileCashfreeOrder() is the single place a payment is ever marked
 * 'Paid' — this asserts it only ever calls out to Cashfree once per real
 * state transition, and that a payment already 'Paid' is never re-processed
 * (never a duplicate email/notification, never a second server-to-server
 * call) no matter how many times it's invoked.
 */
describe('BillingService.reconcileCashfreeOrder — idempotency', () => {
  const notifications = { create: jest.fn() };
  const email = { isConfigured: false, sendMail: jest.fn() };
  const invoices = { generatePdf: jest.fn() };

  const paidPayment = {
    id: 'pay-1', cf_order_id: 'cf-order-1', status: 'Paid', amount: 799,
    patient_id: 'patient-1', doctor_id: 'doctor-1', service: 'Video Consult',
  };
  const pendingPayment = { ...paidPayment, status: 'Pending' };
  const profileNames = { data: [{ id: 'patient-1', full_name: 'Priya' }, { id: 'doctor-1', full_name: 'Dr. Rao' }] };

  it('never calls Cashfree for a payment already marked Paid', async () => {
    const cashfree = { getOrder: jest.fn(), getOrderPayments: jest.fn(), createRefund: jest.fn() };
    const { supabase } = createSupabaseMock({
      payments: [{ data: paidPayment }],
      profiles: [profileNames],
    });
    const service = new BillingService(supabase as any, cashfree as any, invoices as any, notifications as any, email as any);

    const result = await service.reconcileCashfreeOrder('cf-order-1');

    expect(result.status).toBe('Paid');
    expect(cashfree.getOrder).not.toHaveBeenCalled();
  });

  it('calls Cashfree exactly once to settle a Pending payment, then never again on a repeat call', async () => {
    const cashfree = {
      getOrder: jest.fn().mockResolvedValue({ order_status: 'PAID' }),
      getOrderPayments: jest.fn().mockResolvedValue([{ payment_status: 'SUCCESS', cf_payment_id: 'cfp-1', payment_method: { upi: {} } }]),
      createRefund: jest.fn(),
    };
    const { supabase } = createSupabaseMock({
      // 1st call: payment is Pending, gets updated to Paid.
      // 2nd call (simulating a duplicate webhook after the DB now reflects
      // Paid): payment is already Paid.
      payments: [{ data: pendingPayment }, { data: paidPayment }, { data: paidPayment }],
      profiles: [profileNames, profileNames],
    });
    const service = new BillingService(supabase as any, cashfree as any, invoices as any, notifications as any, email as any);

    const first = await service.reconcileCashfreeOrder('cf-order-1');
    expect(first.status).toBe('Paid');
    expect(cashfree.getOrder).toHaveBeenCalledTimes(1);

    const second = await service.reconcileCashfreeOrder('cf-order-1');
    expect(second.status).toBe('Paid');
    // The duplicate/retried call must not re-verify with Cashfree again.
    expect(cashfree.getOrder).toHaveBeenCalledTimes(1);
  });

  it('returns null for an order id with no matching payment, without calling Cashfree', async () => {
    const cashfree = { getOrder: jest.fn(), getOrderPayments: jest.fn(), createRefund: jest.fn() };
    const { supabase } = createSupabaseMock({ payments: [{ data: null }] });
    const service = new BillingService(supabase as any, cashfree as any, invoices as any, notifications as any, email as any);

    const result = await service.reconcileCashfreeOrder('unknown-order');

    expect(result).toBeNull();
    expect(cashfree.getOrder).not.toHaveBeenCalled();
  });
});
