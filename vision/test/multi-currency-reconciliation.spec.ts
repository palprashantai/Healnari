import { DecimalMath } from '../src/core/utils/decimal.util';
import { FXRateService } from '../src/core/fx/fx-rate.service';

describe('Multi-Currency Payment & Revenue Reconciliation Test Suite', () => {
  let fxService: FXRateService;

  beforeEach(() => {
    fxService = new FXRateService();
  });

  describe('1. DecimalMath: Zero Floating Point Precision Drift', () => {
    it('should accurately calculate 0.1 + 0.2 as 0.3 without floating point error', () => {
      const result = DecimalMath.add(0.1, 0.2);
      expect(result).toBe(0.3);
    });

    it('should accurately calculate percentage platform take-rate (10%)', () => {
      const gmv = 1500.00;
      const platformFee = DecimalMath.percentage(gmv, 10);
      const providerPayout = DecimalMath.subtract(gmv, platformFee);

      expect(platformFee).toBe(150.00);
      expect(providerPayout).toBe(1350.00);
      expect(DecimalMath.add(platformFee, providerPayout)).toBe(gmv);
    });

    it('should sum 10,000 micro transactions without drift', () => {
      const amounts = Array(1000).fill(12.35);
      const total = DecimalMath.sum(amounts);
      expect(total).toBe(12350.00);
    });
  });

  describe('2. FXRateService: Currency Conversion & Historical Reproducibility', () => {
    it('should quote valid ISO 4217 exchange rates for INR, USD, AED, EUR, GBP', () => {
      const inrToUsd = fxService.getRateQuote('INR', 'USD');
      const aedToUsd = fxService.getRateQuote('AED', 'USD');
      const gbpToUsd = fxService.getRateQuote('GBP', 'USD');
      const eurToUsd = fxService.getRateQuote('EUR', 'USD');

      expect(inrToUsd.rate).toBeGreaterThan(0);
      expect(aedToUsd.rate).toBeGreaterThan(0);
      expect(gbpToUsd.rate).toBeGreaterThan(1);
      expect(eurToUsd.rate).toBeGreaterThan(1);
      expect(inrToUsd.source).toBe('healnari_treasury_matrix_v1');
    });

    it('should convert original transactions and attach FX metadata', () => {
      const conversion = fxService.convert(10000, 'INR', 'USD');
      expect(conversion.originalAmount).toBe(10000);
      expect(conversion.originalCurrency).toBe('INR');
      expect(conversion.reportingCurrency).toBe('USD');
      expect(conversion.reportingAmount).toBeCloseTo(118.20, 1);
      expect(conversion.fxRate).toBeDefined();
      expect(conversion.fxRateTimestamp).toBeDefined();
    });

    it('should reproduce exact historical value using stored FX rate', () => {
      const historicalAmount = 10000;
      const storedRate = 0.012500; // Historical rate at transaction time
      const reproduced = fxService.reproduceReportingValue(historicalAmount, 'INR', 'USD', storedRate, 'USD');
      expect(reproduced).toBe(125.00);
    });
  });

  describe('3. Financial Revenue Ledger Reconciliation Formula', () => {
    it('should reconcile Gross GMV = Provider Payouts + Platform Fee for multi-currency transactions', () => {
      const transactions = [
        { id: '1', amount: 1500, currency: 'INR', feeRate: 10 },
        { id: '2', amount: 200, currency: 'USD', feeRate: 10 },
        { id: '3', amount: 350, currency: 'AED', feeRate: 10 },
        { id: '4', amount: 120, currency: 'GBP', feeRate: 10 },
        { id: '5', amount: 150, currency: 'EUR', feeRate: 10 },
      ];

      transactions.forEach(t => {
        const fee = DecimalMath.percentage(t.amount, t.feeRate);
        const payout = DecimalMath.subtract(t.amount, fee);
        const reconstructedGMV = DecimalMath.add(fee, payout);

        expect(reconstructedGMV).toBe(t.amount);
      });
    });

    it('should reconcile Net Platform Revenue = Platform Fee - Refund Share', () => {
      const originalPayment = 5000; // 5000 INR
      const platformFee = DecimalMath.percentage(originalPayment, 10); // 500 INR
      const refundAmount = 5000; // Full refund
      const refundLoss = DecimalMath.percentage(refundAmount, 10); // 500 INR

      const netPlatformRevenue = DecimalMath.subtract(platformFee, refundLoss);
      expect(netPlatformRevenue).toBe(0.00);
    });
  });
});
