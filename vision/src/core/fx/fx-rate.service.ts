import { Injectable, Logger } from '@nestjs/common';
import { DecimalMath } from '@/core/utils/decimal.util';

export interface FXConversionResult {
  originalAmount: number;
  originalCurrency: string;
  reportingAmount: number;
  reportingCurrency: string;
  fxRate: number;
  fxRateSource: string;
  fxRateTimestamp: string;
}

export interface FXRateQuote {
  rate: number;
  source: string;
  timestamp: string;
}

@Injectable()
export class FXRateService {
  private readonly logger = new Logger(FXRateService.name);

  // Standard reference rates for internal financial reporting (strictly USD and INR)
  private readonly USD_BASE_RATES: Record<string, number> = {
    USD: 1.0,
    INR: 84.6, // 1 USD = 84.60 INR
  };

  /**
   * Get FX exchange rate quote between any two ISO 4217 currencies
   */
  getRateQuote(fromCurrency = 'INR', toCurrency = 'USD'): FXRateQuote {
    const from = fromCurrency.toUpperCase().trim();
    const to = toCurrency.toUpperCase().trim();
    const timestamp = new Date().toISOString();
    const source = 'healnari_treasury_matrix_v1';

    if (from === to) {
      return { rate: 1.0, source, timestamp };
    }

    const fromUsdRate = this.USD_BASE_RATES[from] || 1.0;
    const toUsdRate = this.USD_BASE_RATES[to] || 1.0;

    // Rate: (1 / fromUsdRate) * toUsdRate
    const rawRate = toUsdRate / fromUsdRate;
    const rate = Number(rawRate.toFixed(6));

    return { rate, source, timestamp };
  }

  /**
   * Convert an amount from one currency to a target reporting currency
   */
  convert(
    amount: number | string,
    fromCurrency = 'INR',
    toCurrency = 'USD',
  ): FXConversionResult {
    const origAmount = Number(amount || 0);
    const from = fromCurrency.toUpperCase().trim();
    const to = toCurrency.toUpperCase().trim();

    const quote = this.getRateQuote(from, to);
    const converted = DecimalMath.multiply(origAmount, quote.rate, 2);

    return {
      originalAmount: origAmount,
      originalCurrency: from,
      reportingAmount: converted,
      reportingCurrency: to,
      fxRate: quote.rate,
      fxRateSource: quote.source,
      fxRateTimestamp: quote.timestamp,
    };
  }

  /**
   * Re-normalize an amount using existing stored transaction-date FX metadata
   * (Guarantees accounting reproducibility across reporting periods)
   */
  reproduceReportingValue(
    originalAmount: number,
    originalCurrency: string,
    targetReportingCurrency = 'USD',
    storedFxRate?: number,
    storedReportingCurrency?: string,
  ): number {
    const from = (originalCurrency || 'INR').toUpperCase();
    const target = targetReportingCurrency.toUpperCase();

    if (from === target) {
      return originalAmount;
    }

    // If already stored in the requested target currency, reuse exact stored value
    if (
      storedReportingCurrency &&
      storedReportingCurrency.toUpperCase() === target &&
      storedFxRate
    ) {
      return DecimalMath.multiply(originalAmount, storedFxRate, 2);
    }

    // Convert via base rate
    const quote = this.getRateQuote(from, target);
    return DecimalMath.multiply(originalAmount, quote.rate, 2);
  }
}
