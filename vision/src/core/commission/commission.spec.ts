import { CommissionService } from './commission.service';

describe('CommissionService (Global Single Source of Truth)', () => {
  let service: CommissionService;
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      admin: {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { platform_commission_rate: 10 },
          error: null,
        }),
      },
    };
    service = new CommissionService(mockSupabase);
  });

  describe('Dynamic Global Commission Rate Resolution', () => {
    it('loads dynamic rate from database (10%)', async () => {
      const rate = await service.getGlobalCommissionRate();
      expect(rate).toBe(10);
    });

    it('loads updated dynamic rate when database changes (15%)', async () => {
      mockSupabase.admin.maybeSingle.mockResolvedValueOnce({
        data: { platform_commission_rate: 15 },
        error: null,
      });
      service.invalidateCache();
      const rate = await service.getGlobalCommissionRate();
      expect(rate).toBe(15);
    });
  });

  describe('Commission & Doctor Net Calculation', () => {
    it('calculates 10% commission on ₹1,000 correctly (₹100 fee, ₹900 doctor)', () => {
      const breakdown = service.calculatePayout(1000, 10);
      expect(breakdown.grossAmount).toBe(1000);
      expect(breakdown.commissionRate).toBe(10);
      expect(breakdown.commissionAmount).toBe(100);
      expect(breakdown.providerPayoutAmount).toBe(900);
    });

    it('calculates 15% commission on ₹1,000 correctly (₹150 fee, ₹850 doctor)', () => {
      const breakdown = service.calculatePayout(1000, 15);
      expect(breakdown.grossAmount).toBe(1000);
      expect(breakdown.commissionRate).toBe(15);
      expect(breakdown.commissionAmount).toBe(150);
      expect(breakdown.providerPayoutAmount).toBe(850);
    });
  });

  describe('Historical Payment Snapshot Preservation', () => {
    it('always honours stored snapshot on existing transactions even when current global rate changes', () => {
      // Historical payment recorded when global rate was 10%
      const storedPayment = {
        amount: 1000,
        commission_rate: 10,
        platform_fee_amount: 100,
        provider_payout_amount: 900,
      };

      const breakdown = service.fromStoredPayment(storedPayment);
      expect(breakdown.commissionAmount).toBe(100);
      expect(breakdown.providerPayoutAmount).toBe(900);
      expect(breakdown.commissionRate).toBe(10);
    });
  });
});
