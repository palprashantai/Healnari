import { AdminCronService } from '@/modules/admin/services/admin-cron.service';
import { BillingCronService } from '@/modules/billing/services/billing-cron.service';
import { AppointmentsService } from '@/modules/appointments/services/appointments.service';
import { PrescriptionsCronService } from '@/modules/records/services/prescriptions-cron.service';
import { createSupabaseMock } from '@/test-utils/supabase-mock';

describe('Background Cron Services Suite', () => {
  describe('AdminCronService.reconcileDailyPlatformRevenue', () => {
    const notifications = { create: jest.fn().mockResolvedValue({}) };
    const email = { sendMail: jest.fn().mockResolvedValue(true), sendTemplatedMail: jest.fn().mockResolvedValue(true) };

    it('accurately reconciles gross, 15% platform commission, and doctor net payouts for Paid payments', async () => {
      const mockPayments = [
        { id: 'p-1', amount: 1000, status: 'Paid', created_at: new Date().toISOString(), doctor_id: 'doc-1' },
        { id: 'p-2', amount: 2000, status: 'Paid', created_at: new Date().toISOString(), doctor_id: 'doc-2' },
      ];
      const mockAdmins = [{ id: 'admin-1' }];

      const { supabase, calls } = createSupabaseMock({
        payments: [{ data: mockPayments, error: null }],
        profiles: [{ data: mockAdmins, error: null }],
      });

      const service = new AdminCronService(supabase as any, notifications as any, email as any);
      await service.reconcileDailyPlatformRevenue();

      // Assert it filtered by status 'Paid'
      const statusCall = calls.find(c => c.table === 'payments' && c.method === 'eq' && c.args[0] === 'status');
      expect(statusCall).toBeDefined();
      expect(statusCall?.args[1]).toBe('Paid');

      // Assert notification dispatched to admin with revenue summary
      expect(notifications.create).toHaveBeenCalledWith(
        'admin-1',
        expect.objectContaining({
          type: 'admin_daily_revenue_summary',
          title: 'Daily Platform Revenue Summary',
        }),
      );
    });
  });

  describe('BillingCronService.processAutomatedRefundsForCancelledAppointments', () => {
    const notifications = { create: jest.fn().mockResolvedValue({}) };
    const cashfree = { createRefund: jest.fn().mockResolvedValue({ refund_id: 'ref-123' }) };
    const email = { sendMail: jest.fn().mockResolvedValue(true), sendTemplatedMail: jest.fn().mockResolvedValue(true) };

    it('triggers automated Cashfree refund and marks payment status as Refunded', async () => {
      const mockPendingPayments = [
        {
          id: 'pay-123',
          patient_id: 'patient-1',
          appointment_id: 'apt-999',
          amount: 500,
          cf_order_id: 'cf_order_999',
          status: 'Refund Pending',
          currency: 'INR',
        },
      ];

      const { supabase } = createSupabaseMock({
        payments: [
          { data: mockPendingPayments, error: null },
          { data: { id: 'pay-123', status: 'Refunded' }, error: null },
        ],
        appointments: [
          { data: { id: 'apt-999' }, error: null },
        ],
        refund_requests: [
          { data: {}, error: null },
        ],
      });

      const service = new BillingCronService(supabase as any, cashfree as any, notifications as any, email as any);
      await service.processAutomatedRefundsForCancelledAppointments();

      // Verified Cashfree createRefund was invoked with cf_order_id and amount
      expect(cashfree.createRefund).toHaveBeenCalledWith(
        'cf_order_999',
        500,
        expect.stringContaining('ref_pay-123_'),
        'Automated refund for cancelled consultation',
      );

      // Verified patient notification was dispatched
      expect(notifications.create).toHaveBeenCalledWith(
        'patient-1',
        expect.objectContaining({
          type: 'payment_refund_processed',
          title: 'Refund Processed',
        }),
      );
    });
  });

  describe('AppointmentsService.processNoShows', () => {
    const notifications = { create: jest.fn().mockResolvedValue({}) };
    const ai = {};
    const email = { sendMail: jest.fn().mockResolvedValue(true), sendTemplatedMail: jest.fn().mockResolvedValue(true) };

    it('marks overdue appointments as NO_SHOW via atomic bulk update', async () => {
      const overdueApts = [
        { id: 'apt-1', patient_id: 'pat-1', doctor_id: 'doc-1' },
        { id: 'apt-2', patient_id: 'pat-2', doctor_id: 'doc-1' },
      ];

      const { supabase, calls } = createSupabaseMock({
        appointments: [
          { data: overdueApts, error: null },
          { data: [{ id: 'apt-1' }, { id: 'apt-2' }], error: null },
        ],
      });

      const service = new AppointmentsService(supabase as any, notifications as any, ai as any, email as any);
      await service.processNoShows();

      const updateCall = calls.find(c => c.table === 'appointments' && c.method === 'update');
      expect(updateCall).toBeDefined();
      expect(updateCall?.args[0]).toEqual({ status: 'No Show' });
    });
  });

  describe('PrescriptionsCronService.sendLifestyleDailyReminder', () => {
    const notifications = { create: jest.fn().mockResolvedValue({}) };
    const email = { isConfigured: false, sendMail: jest.fn(), sendTemplatedMail: jest.fn() };

    it('queries lifestyle_logs using the correct log_date column', async () => {
      const { supabase, calls } = createSupabaseMock({
        prescriptions: [{ data: [{ patient_id: 'pat-1', instructions: '{"type":"healnari-holistic-v1"}' }], error: null }],
        lifestyle_logs: [{ data: [], error: null }], // pat-1 has not logged today
      });

      const service = new PrescriptionsCronService(supabase as any, notifications as any, email as any);
      await service.sendLifestyleDailyReminder();

      const logDateCall = calls.find(c => c.table === 'lifestyle_logs' && c.method === 'eq');
      expect(logDateCall).toBeDefined();
      expect(logDateCall?.args[0]).toBe('log_date');

      expect(notifications.create).toHaveBeenCalledWith(
        'pat-1',
        expect.objectContaining({
          type: 'lifestyle_daily_reminder',
          title: 'Daily Wellness Check-in',
        }),
      );
    });
  });
});
