import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { DecimalMath } from '@/core/utils/decimal.util';

export interface PayoutBreakdown {
  /** Original consultation / charge gross amount */
  grossAmount: number;
  /** Active global platform commission percentage (e.g. 10 or 15) */
  commissionRate: number;
  /** Platform fee = grossAmount × commissionRate / 100 */
  commissionAmount: number;
  /** Net doctor earnings = grossAmount − commissionAmount */
  providerPayoutAmount: number;
}

@Injectable()
export class CommissionService {
  private readonly logger = new Logger(CommissionService.name);

  // In-memory cache for dynamic global commission rate (TTL 60s)
  private cachedRate: number | null = null;
  private cacheExpiresAt = 0;

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Fetches the dynamic active global platform commission rate directly from the database.
   * NEVER hardcodes the percentage.
   */
  async getGlobalCommissionRate(): Promise<number> {
    const now = Date.now();
    if (this.cachedRate !== null && now < this.cacheExpiresAt) {
      return this.cachedRate;
    }

    try {
      const { data, error } = await this.supabase.admin
        .from('landing_settings')
        .select('platform_commission_rate')
        .eq('id', 1)
        .maybeSingle();

      if (error || !data || data.platform_commission_rate === null || data.platform_commission_rate === undefined) {
        this.logger.warn('Failed to load global commission from database, using fallback 10%');
        this.cachedRate = 10;
      } else {
        this.cachedRate = Number(data.platform_commission_rate);
      }
    } catch (err: any) {
      this.logger.error(`Error querying global commission rate: ${err.message}`);
      this.cachedRate = 10;
    }

    this.cacheExpiresAt = now + 60_000; // Cache for 60 seconds
    return this.cachedRate;
  }

  /**
   * Invalidates the in-memory cache when an admin updates the global commission rate.
   */
  invalidateCache(): void {
    this.cachedRate = null;
    this.cacheExpiresAt = 0;
  }

  /**
   * Calculates the full financial payout breakdown using precise decimal math.
   *
   * @param grossAmount Original transaction gross amount
   * @param commissionRate Active dynamic global commission rate
   */
  calculatePayout(grossAmount: number, commissionRate: number): PayoutBreakdown {
    const safeGross = Number(grossAmount) || 0;
    const safeRate = Number(commissionRate) || 0;

    const commissionAmount = DecimalMath.percentage(safeGross, safeRate);
    const providerPayoutAmount = DecimalMath.subtract(safeGross, commissionAmount);

    return {
      grossAmount: safeGross,
      commissionRate: safeRate,
      commissionAmount,
      providerPayoutAmount,
    };
  }

  /**
   * Reads financial breakdown from an already-stored payment record.
   * NEVER recalculates historical transactions using the current global rate.
   */
  fromStoredPayment(payment: {
    amount?: number | string | null;
    original_amount?: number | string | null;
    base_amount?: number | string | null;
    commission_rate?: number | string | null;
    platform_fee_amount?: number | string | null;
    provider_payout_amount?: number | string | null;
  }): PayoutBreakdown {
    const gross = Number(payment.base_amount || payment.original_amount || payment.amount || 0);
    const storedFee = Number(payment.platform_fee_amount || 0);
    const storedPayout = Number(payment.provider_payout_amount || 0);
    const storedRate = Number(payment.commission_rate || 0);

    if (storedFee > 0 || storedPayout > 0) {
      const calculatedRate =
        storedRate ||
        (gross > 0
          ? Number(DecimalMath.divide(DecimalMath.multiply(storedFee, 100), gross))
          : 10);

      return {
        grossAmount: gross,
        commissionRate: calculatedRate,
        commissionAmount: storedFee,
        providerPayoutAmount: storedPayout || DecimalMath.subtract(gross, storedFee),
      };
    }

    // Fallback for pre-migration unpopulated records
    const rate = storedRate || 10;
    return this.calculatePayout(gross, rate);
  }
}
