import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { DecimalMath } from '@/core/utils/decimal.util';

export interface FXConversionResult {
  baseAmount: number;
  baseCurrency: string;
  convertedAmount: number;
  convertedCurrency: string;
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
   * Validates that the application strictly uses INR or USD.
   */
  validateCurrency(currency: string): string {
    const code = (currency || 'INR').toUpperCase().trim();
    if (code !== 'INR' && code !== 'USD') {
      throw new BadRequestException(`Unsupported currency: ${code}. Only INR and USD are supported.`);
    }
    return code;
  }

  /**
   * Centralized rounding policy per currency:
   * - INR: Whole integer rounding for clean patient checkout (e.g. ₹4,230)
   * - USD: Standard 2-decimal minor units for international cards (e.g. $23.64)
   */
  roundAmount(amount: number, currency: string): number {
    const code = this.validateCurrency(currency);
    if (code === 'INR') {
      return Math.round(Number(amount || 0));
    }
    return Number(DecimalMath.formatFixed(amount, 2));
  }

  /**
   * Get FX exchange rate quote between any two ISO 4217 currencies
   */
  getExchangeRate(fromCurrency = 'INR', toCurrency = 'USD'): FXRateQuote {
    const from = this.validateCurrency(fromCurrency);
    const to = this.validateCurrency(toCurrency);
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
   * Convert an amount from one currency to a target currency
   */
  convertAmount(
    baseAmount: number | string,
    fromCurrency = 'INR',
    toCurrency = 'USD',
  ): FXConversionResult {
    const origAmount = Number(baseAmount || 0);
    const from = this.validateCurrency(fromCurrency);
    const to = this.validateCurrency(toCurrency);

    const quote = this.getExchangeRate(from, to);
    const converted = this.roundAmount(DecimalMath.multiply(origAmount, quote.rate, 2), to);

    return {
      baseAmount: origAmount,
      baseCurrency: from,
      convertedAmount: converted,
      convertedCurrency: to,
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
    targetReportingCurrency = 'INR',
    storedFxRate?: number,
    storedReportingCurrency?: string,
    storedReportingAmount?: number,
  ): number {
    const from = this.validateCurrency(originalCurrency);
    const target = this.validateCurrency(targetReportingCurrency);

    if (from === target) {
      return originalAmount;
    }

    // If an exact immutable snapshot amount was recorded in the database for this target currency
    if (
      storedReportingCurrency &&
      storedReportingCurrency.toUpperCase() === target &&
      storedReportingAmount !== undefined &&
      storedReportingAmount !== null &&
      Number(storedReportingAmount) > 0
    ) {
      return Number(storedReportingAmount);
    }

    // If already stored in the requested target currency, reuse exact stored value
    // Guard against internal domestic doctor-patient exchange rate (e.g. 1.0) being misapplied as currency FX
    if (
      storedReportingCurrency &&
      storedReportingCurrency.toUpperCase() === target &&
      storedFxRate &&
      !(from === 'INR' && target === 'USD' && storedFxRate >= 0.5) &&
      !(from === 'USD' && target === 'INR' && storedFxRate <= 2)
    ) {
      return this.roundAmount(DecimalMath.multiply(originalAmount, storedFxRate, 2), target);
    }

    // Convert via base rate
    const quote = this.getExchangeRate(from, target);
    return this.roundAmount(DecimalMath.multiply(originalAmount, quote.rate, 2), target);
  }

  /** Backward-compatible alias for getExchangeRate */
  getRateQuote(fromCurrency = 'INR', toCurrency = 'USD'): FXRateQuote {
    return this.getExchangeRate(fromCurrency, toCurrency);
  }

  /** Backward-compatible alias for convertAmount */
  convert(
    baseAmount: number | string,
    fromCurrency = 'INR',
    toCurrency = 'USD',
  ): FXConversionResult & { reportingAmount: number; reportingCurrency: string; rate: number } {
    const res = this.convertAmount(baseAmount, fromCurrency, toCurrency);
    return {
      ...res,
      reportingAmount: res.convertedAmount,
      reportingCurrency: res.convertedCurrency,
      rate: res.fxRate,
    };
  }
}
