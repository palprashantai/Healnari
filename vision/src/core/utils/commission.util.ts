import { DecimalMath } from '@/core/utils/decimal.util';

/**
 * The result of a payout calculation — every field needed for the
 * payments row and downstream reporting.
 */
export interface PayoutBreakdown {
  /** Original consultation/billing amount (what the patient pays) */
  grossAmount: number;
  /** The commission percentage that was applied (e.g. 15) */
  commissionRate: number;
  /** Platform fee = grossAmount × commissionRate / 100 */
  commissionAmount: number;
  /** What the doctor receives = grossAmount − commissionAmount */
  providerPayoutAmount: number;
}

/**
 * CommissionCalculator — THE authoritative payout calculator.
 *
 * Rules:
 * 1. Commission is calculated EXACTLY ONCE per financial transaction.
 * 2. The applied rate is SNAPSHOTTED on the payment row at creation time.
 * 3. Later changes to a doctor's rate NEVER affect existing transactions.
 * 4. Every service that needs commission math calls this utility —
 *    no inline `amount * rate / 100` anywhere else in the codebase.
 */
export class CommissionCalculator {
  /** The standard global platform commission rate (10% platform fee, 90% doctor payout) */
  static readonly GLOBAL_COMMISSION_RATE = 10;
  static readonly DEFAULT_COMMISSION_RATE = 10;

  /**
   * Resolve the global platform commission rate.
   * Standardized globally across all doctors in the network.
   */
  static resolveCommissionRate(
    customRate?: number | null | undefined,
  ): number {
    const rate = Number(customRate);
    if (!isNaN(rate) && rate >= 0 && rate <= 100) return rate;
    return CommissionCalculator.GLOBAL_COMMISSION_RATE;
  }

  /**
   * Calculate the full payout breakdown for a financial transaction.
   *
   * This is THE function that computes:
   *   grossAmount → commissionAmount → providerPayoutAmount
   *
   * Uses DecimalMath to prevent floating-point drift.
   *
   * @example
   * CommissionCalculator.calculatePayout(1000, 10)
   * // → { grossAmount: 1000, commissionRate: 10, commissionAmount: 100, providerPayoutAmount: 900 }
   */
  static calculatePayout(
    grossAmount: number,
    commissionRate: number,
  ): PayoutBreakdown {
    const safeGross = Number(grossAmount) || 0;
    const safeRate = CommissionCalculator.resolveCommissionRate(commissionRate);

    const commissionAmount = DecimalMath.percentage(safeGross, safeRate);
    const providerPayoutAmount = DecimalMath.subtract(
      safeGross,
      commissionAmount,
    );

    return {
      grossAmount: safeGross,
      commissionRate: safeRate,
      commissionAmount,
      providerPayoutAmount,
    };
  }

  /**
   * Read the commission breakdown from an already-stored payment record.
   *
   * When platform_fee_amount and provider_payout_amount are stored on the
   * payment row (which they have been since migration 0047), this method
   * returns the STORED values rather than recalculating — preserving the
   * historical snapshot even if the doctor's rate has changed since.
   *
   * Falls back to recalculation only when stored values are missing
   * (pre-migration records).
   */
  static fromStoredPayment(payment: {
    amount?: number | string | null;
    original_amount?: number | string | null;
    commission_rate?: number | string | null;
    platform_fee_amount?: number | string | null;
    provider_payout_amount?: number | string | null;
  }): PayoutBreakdown {
    const gross = Number(payment.original_amount || payment.amount || 0);
    const storedFee = Number(payment.platform_fee_amount || 0);
    const storedPayout = Number(payment.provider_payout_amount || 0);
    const storedRate = Number(payment.commission_rate || 0);

    // If the payment has stored financial amounts, honour them
    if (storedFee > 0 || storedPayout > 0) {
      return {
        grossAmount: gross,
        commissionRate: storedRate || (gross > 0
          ? Number(DecimalMath.divide(DecimalMath.multiply(storedFee, 100), gross))
          : CommissionCalculator.DEFAULT_COMMISSION_RATE),
        commissionAmount: storedFee,
        providerPayoutAmount: storedPayout || DecimalMath.subtract(gross, storedFee),
      };
    }

    // Fallback: recalculate using stored or default rate
    return CommissionCalculator.calculatePayout(
      gross,
      storedRate || CommissionCalculator.DEFAULT_COMMISSION_RATE,
    );
  }
}
