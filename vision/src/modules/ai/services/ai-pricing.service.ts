import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { FXRateService } from '@/core/fx/fx-rate.service';
import { DecimalMath } from '@/core/utils/decimal.util';
import type { AuthUser } from '@/core/decorators/current-user.decorator';
import {
  CountryConfig,
  CurrencyConfig,
  AiPlan,
  AiRegionalPrice,
  AiResolvedPriceQuote,
  AiCoupon,
  PricingSimulationInput,
  PricingSimulationResult,
} from '../interfaces/ai-globalization.interface';

// Default In-Memory Fallbacks for zero-downtime resilience
export const DEFAULT_COUNTRIES: Record<string, CountryConfig> = {
  IN: {
    code: 'IN',
    name: 'India',
    region: 'Asia',
    default_currency: 'INR',
    supported_currencies: ['INR'],
    timezone: 'Asia/Kolkata',
    locale: 'en-IN',
    phone_prefix: '+91',
    tax_rate: 18.0,
    tax_name: 'GST',
    tax_type: 'inclusive',
    payment_gateway: 'cashfree',
    is_active: true,
    is_ai_enabled: true,
  },
  US: {
    code: 'US',
    name: 'International (USD)',
    region: 'Global',
    default_currency: 'USD',
    supported_currencies: ['USD'],
    timezone: 'America/New_York',
    locale: 'en-US',
    phone_prefix: '+1',
    tax_rate: 0.0,
    tax_name: 'Sales Tax',
    tax_type: 'exclusive',
    payment_gateway: 'stripe',
    is_active: true,
    is_ai_enabled: true,
  },
};

export const DEFAULT_CURRENCIES: Record<string, CurrencyConfig> = {
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', minor_decimals: 2, is_active: true, is_reporting_currency: true, usd_base_rate: 1.0 },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', minor_decimals: 2, is_active: true, is_reporting_currency: true, usd_base_rate: 1.0 },
};

export const DEFAULT_PLANS: Record<string, AiPlan> = {
  patient_free: {
    id: 'patient_free',
    product_id: 'prod_patient_ai',
    name: 'HealNari Free Companion',
    description: 'Free introductory cycle companion and basic wellness guide',
    billing_cycle: 'monthly',
    plan_type: 'subscription',
    included_monthly_credits: 10,
    bonus_credits: 0,
    rollover_unused_credits: false,
    is_active: true,
    is_public: true,
    plan_version: 1,
    features: ['PATIENT_CHAT'],
  },
  patient_premium: {
    id: 'patient_premium',
    product_id: 'prod_patient_ai',
    name: 'HealNari AI Premium',
    description: 'Unlimited cycle calibration, lab decoder, consult prep, and 500 AI credits/mo',
    billing_cycle: 'monthly',
    plan_type: 'subscription',
    included_monthly_credits: 500,
    bonus_credits: 50,
    rollover_unused_credits: false,
    is_active: true,
    is_public: true,
    plan_version: 1,
    features: ['PATIENT_CHAT', 'PATIENT_LAB_ANALYSIS', 'PATIENT_CONSULT_PREP'],
  },
  patient_premium_yearly: {
    id: 'patient_premium_yearly',
    product_id: 'prod_patient_ai',
    name: 'HealNari AI Premium Annual',
    description: 'Annual VIP subscription with 2 months free and 500 AI credits/mo',
    billing_cycle: 'yearly',
    plan_type: 'subscription',
    included_monthly_credits: 500,
    bonus_credits: 200,
    rollover_unused_credits: true,
    is_active: true,
    is_public: true,
    plan_version: 1,
    features: ['PATIENT_CHAT', 'PATIENT_LAB_ANALYSIS', 'PATIENT_CONSULT_PREP'],
  },
  doctor_free: {
    id: 'doctor_free',
    product_id: 'prod_doctor_ai',
    name: 'Doctor Standard',
    description: 'Basic prescription autocomplete and drug safety checks',
    billing_cycle: 'monthly',
    plan_type: 'subscription',
    included_monthly_credits: 20,
    bonus_credits: 0,
    rollover_unused_credits: false,
    is_active: true,
    is_public: true,
    plan_version: 1,
    features: ['DOCTOR_RX_AUTOCOMPLETE', 'DOCTOR_DRUG_SAFETY'],
  },
  doctor_pro: {
    id: 'doctor_pro',
    product_id: 'prod_doctor_ai',
    name: 'Doctor AI Pro',
    description: 'Full pre-consult patient briefs, vector RAG SOAP notes, and 1,000 AI credits/mo',
    billing_cycle: 'monthly',
    plan_type: 'subscription',
    included_monthly_credits: 1000,
    bonus_credits: 100,
    rollover_unused_credits: false,
    is_active: true,
    is_public: true,
    plan_version: 1,
    features: ['DOCTOR_PATIENT_BRIEF', 'DOCTOR_SOAP_NOTES', 'DOCTOR_RX_AUTOCOMPLETE', 'DOCTOR_DRUG_SAFETY', 'DOCTOR_CONSULT_SUMMARY'],
  },
  doctor_pro_yearly: {
    id: 'doctor_pro_yearly',
    product_id: 'prod_doctor_ai',
    name: 'Doctor AI Pro Annual',
    description: 'Annual clinical subscription with unlimited autocomplete and 1,000 AI credits/mo',
    billing_cycle: 'yearly',
    plan_type: 'subscription',
    included_monthly_credits: 1000,
    bonus_credits: 300,
    rollover_unused_credits: true,
    is_active: true,
    is_public: true,
    plan_version: 1,
    features: ['DOCTOR_PATIENT_BRIEF', 'DOCTOR_SOAP_NOTES', 'DOCTOR_RX_AUTOCOMPLETE', 'DOCTOR_DRUG_SAFETY', 'DOCTOR_CONSULT_SUMMARY'],
  },
};

export const DEFAULT_REGIONAL_PRICES: Record<string, Record<string, { amount: number; currency: string }>> = {
  patient_premium: {
    IN: { amount: 999.0, currency: 'INR' },
    US: { amount: 19.0, currency: 'USD' },
  },
  patient_premium_yearly: {
    IN: { amount: 9999.0, currency: 'INR' },
    US: { amount: 190.0, currency: 'USD' },
  },
  doctor_pro: {
    IN: { amount: 1999.0, currency: 'INR' },
    US: { amount: 29.0, currency: 'USD' },
  },
  doctor_pro_yearly: {
    IN: { amount: 19999.0, currency: 'INR' },
    US: { amount: 290.0, currency: 'USD' },
  },
};

@Injectable()
export class AiPricingService {
  private readonly logger = new Logger(AiPricingService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly fxRateService: FXRateService,
  ) {}

  /**
   * Resolves country and currency from user profile or explicit request
   */
  resolveCountryAndCurrency(
    user?: AuthUser | null,
    explicitCountry?: string,
    explicitCurrency?: string,
  ): { countryCode: string; currencyCode: string } {
    let currencyCode = (explicitCurrency || user?.profile?.currency || 'INR').toUpperCase().trim();
    if (currencyCode !== 'INR' && currencyCode !== 'USD') {
      currencyCode = 'INR';
    }

    const countryCode = currencyCode === 'USD' ? 'US' : 'IN';
    return { countryCode, currencyCode };
  }

  /**
   * Fetches Country Config
   */
  async getCountry(countryCode: string): Promise<CountryConfig> {
    const code = countryCode.toUpperCase();
    try {
      const { data, error } = await this.supabase.admin
        .from('countries')
        .select('*')
        .eq('code', code)
        .maybeSingle();

      if (!error && data) return data as CountryConfig;
    } catch {}
    return DEFAULT_COUNTRIES[code] || DEFAULT_COUNTRIES.IN;
  }

  /**
   * Fetches all supported countries
   */
  async getAllCountries(): Promise<CountryConfig[]> {
    try {
      const { data, error } = await this.supabase.admin
        .from('countries')
        .select('*')
        .order('name');

      if (!error && data && data.length > 0) return data as CountryConfig[];
    } catch {}
    return Object.values(DEFAULT_COUNTRIES);
  }

  /**
   * Fetches all supported currencies
   */
  async getAllCurrencies(): Promise<CurrencyConfig[]> {
    try {
      const { data, error } = await this.supabase.admin
        .from('currencies')
        .select('*')
        .order('code');

      if (!error && data && data.length > 0) return data as CurrencyConfig[];
    } catch {}
    return Object.values(DEFAULT_CURRENCIES);
  }

  /**
   * Authoritative Multi-Currency Price Resolution with Tax & Coupon calculation
   */
  async getPricingQuote(
    planId: string,
    countryCode = 'IN',
    currencyCode = 'INR',
    couponCode?: string,
  ): Promise<AiResolvedPriceQuote> {
    const normalizedCurrency = (currencyCode || 'INR').toUpperCase().trim();
    if (normalizedCurrency !== 'INR' && normalizedCurrency !== 'USD') {
      throw new BadRequestException(
        `Unsupported currency "${currencyCode}". HealNari strictly supports only INR and USD.`,
      );
    }

    const effectiveCountryCode = normalizedCurrency === 'USD' ? 'US' : 'IN';
    const country = await this.getCountry(effectiveCountryCode);
    const plan = DEFAULT_PLANS[planId];
    if (!plan) {
      throw new NotFoundException(`AI Plan "${planId}" does not exist.`);
    }

    // 1. Resolve explicit regional base price
    let baseAmount = 0;
    let priceVersion = 1;

    try {
      const { data: priceRow } = await this.supabase.admin
        .from('ai_regional_prices')
        .select('*')
        .eq('plan_id', planId)
        .eq('country_code', country.code)
        .eq('currency', currencyCode)
        .eq('is_active', true)
        .order('price_version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (priceRow) {
        baseAmount = Number(priceRow.base_amount);
        priceVersion = priceRow.price_version;
      } else {
        const fallback = DEFAULT_REGIONAL_PRICES[planId]?.[country.code] ||
          DEFAULT_REGIONAL_PRICES[planId]?.IN || { amount: 0, currency: 'INR' };
        baseAmount = fallback.amount;
      }
    } catch {
      const fallback = DEFAULT_REGIONAL_PRICES[planId]?.[country.code] ||
        DEFAULT_REGIONAL_PRICES[planId]?.IN || { amount: 0, currency: 'INR' };
      baseAmount = fallback.amount;
    }

    // 2. Tax Calculation
    const taxRate = Number(country.tax_rate || 0);
    let taxAmount = 0;
    let netBeforeTax = baseAmount;

    if (country.tax_type === 'inclusive' && taxRate > 0) {
      // Amount includes tax: Tax = Base - (Base / (1 + Rate))
      netBeforeTax = DecimalMath.divide(baseAmount, 1 + taxRate / 100);
      taxAmount = DecimalMath.subtract(baseAmount, netBeforeTax);
    } else if (country.tax_type === 'exclusive' && taxRate > 0) {
      // Tax added on top
      taxAmount = DecimalMath.percentage(baseAmount, taxRate);
    }

    // 3. Coupon Discount Calculation
    let discountAmount = 0;
    if (couponCode) {
      const coupon = await this.validateCoupon(couponCode, planId, country.code, currencyCode);
      if (coupon) {
        if (coupon.discount_type === 'percentage') {
          discountAmount = DecimalMath.percentage(baseAmount, coupon.discount_value);
        } else if (coupon.discount_type === 'fixed_amount') {
          discountAmount = Math.min(baseAmount, Number(coupon.discount_value));
        }
      }
    }

    // 4. Final Amount Calculation
    let finalAmount = baseAmount;
    if (country.tax_type === 'exclusive') {
      finalAmount = DecimalMath.subtract(
        DecimalMath.add(baseAmount, taxAmount),
        discountAmount,
      );
    } else {
      finalAmount = DecimalMath.subtract(baseAmount, discountAmount);
    }
    finalAmount = Math.max(0, finalAmount);

    const currMeta = DEFAULT_CURRENCIES[currencyCode] || { symbol: currencyCode };

    return {
      planId: plan.id,
      planName: plan.name,
      countryCode: country.code,
      countryName: country.name,
      currency: currencyCode,
      currencySymbol: currMeta.symbol,
      baseAmount,
      taxRate,
      taxName: country.tax_name,
      taxType: country.tax_type,
      taxAmount,
      discountAmount,
      finalAmount,
      priceVersion,
      billingCycle: plan.billing_cycle,
      includedCredits: plan.included_monthly_credits + (plan.bonus_credits || 0),
      features: plan.features,
      gateway: country.payment_gateway,
    };
  }

  /**
   * Fetches all active plans for a country/currency
   */
  async getAllPlansForMarket(
    countryCode = 'IN',
    currencyCode = 'INR',
    role?: 'patient' | 'doctor',
  ): Promise<AiResolvedPriceQuote[]> {
    const normalizedCurrency = (currencyCode || 'INR').toUpperCase().trim();
    if (normalizedCurrency !== 'INR' && normalizedCurrency !== 'USD') {
      throw new BadRequestException(
        `Unsupported currency "${currencyCode}". HealNari strictly supports only INR and USD.`,
      );
    }
    const effectiveCountry = normalizedCurrency === 'USD' ? 'US' : 'IN';
    const plans = Object.values(DEFAULT_PLANS).filter(
      (p) => p.is_active && (!role || p.product_id.includes(role)),
    );

    const quotes: AiResolvedPriceQuote[] = [];
    for (const p of plans) {
      const quote = await this.getPricingQuote(p.id, effectiveCountry, normalizedCurrency);
      quotes.push(quote);
    }

    return quotes;
  }

  /**
   * Validates Coupon against country, currency, and plan eligibility
   */
  async validateCoupon(
    code: string,
    planId: string,
    countryCode: string,
    currencyCode: string,
  ): Promise<AiCoupon | null> {
    const cleanCode = code.trim().toUpperCase();

    // In-memory defaults
    if (cleanCode === 'HEALNARI20') {
      return {
        code: 'HEALNARI20',
        discount_type: 'percentage',
        discount_value: 20,
        max_uses: 500,
        current_uses: 0,
        valid_from: new Date().toISOString(),
        is_active: true,
      };
    }
    if (cleanCode === 'WELCOME100' && countryCode === 'IN' && currencyCode === 'INR') {
      return {
        code: 'WELCOME100',
        discount_type: 'fixed_amount',
        discount_value: 100,
        allowed_country: 'IN',
        allowed_currency: 'INR',
        max_uses: 1000,
        current_uses: 0,
        valid_from: new Date().toISOString(),
        is_active: true,
      };
    }
    if (cleanCode === 'USAPROMO5' && countryCode === 'US' && currencyCode === 'USD') {
      return {
        code: 'USAPROMO5',
        discount_type: 'fixed_amount',
        discount_value: 5,
        allowed_country: 'US',
        allowed_currency: 'USD',
        max_uses: 500,
        current_uses: 0,
        valid_from: new Date().toISOString(),
        is_active: true,
      };
    }

    try {
      const { data: coupon } = await this.supabase.admin
        .from('ai_coupons')
        .select('*')
        .eq('code', cleanCode)
        .eq('is_active', true)
        .maybeSingle();

      if (!coupon) return null;

      if (coupon.allowed_country && coupon.allowed_country !== countryCode) {
        throw new BadRequestException(`Coupon "${code}" is only valid in ${coupon.allowed_country}.`);
      }
      if (coupon.allowed_currency && coupon.allowed_currency !== currencyCode) {
        throw new BadRequestException(`Coupon "${code}" is only valid for ${coupon.allowed_currency} payments.`);
      }
      if (coupon.allowed_plan_ids?.length && !coupon.allowed_plan_ids.includes(planId)) {
        throw new BadRequestException(`Coupon "${code}" is not applicable to this plan.`);
      }

      return coupon as AiCoupon;
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      return null;
    }
  }

  /**
   * Admin Pricing Profitability Simulator
   */
  simulatePricing(input: PricingSimulationInput): PricingSimulationResult {
    const {
      countryCode,
      currency,
      basePrice,
      expectedAvgQueriesPerUser,
      model = 'gemini-1.5-flash',
      taxRatePercent = 0,
      gatewayFeePercent = 2.0,
      expectedUsers = 100,
    } = input;

    // 1. Revenue
    const grossRevenuePerUser = basePrice;
    const taxAmountPerUser = DecimalMath.percentage(basePrice, taxRatePercent);
    const netRevenuePerUser = DecimalMath.subtract(basePrice, taxAmountPerUser);

    // 2. Token Infrastructure Cost Calculation
    // Average query: ~600 input tokens + ~400 output tokens = 1000 tokens
    // Gemini 1.5 Flash: $0.075 / 1M input, $0.30 / 1M output -> ~$0.000165 per query
    let costPerQueryUsd = 0.000165;
    if (model === 'gpt-4o-mini') {
      costPerQueryUsd = 0.000330;
    } else if (model === 'gemini-1.5-pro') {
      costPerQueryUsd = 0.002750;
    }

    const estimatedAiCostPerUserUsd = Number(
      (expectedAvgQueriesPerUser * costPerQueryUsd).toFixed(4),
    );

    // Convert USD cost to target currency using FXRateService
    const fxQuote = this.fxRateService.getRateQuote('USD', currency);
    const estimatedAiCostPerUserLocal = DecimalMath.multiply(
      estimatedAiCostPerUserUsd,
      fxQuote.rate,
    );

    // 3. Payment Gateway Fee
    const gatewayFeePerUserLocal = DecimalMath.percentage(basePrice, gatewayFeePercent);

    // 4. Contribution Margin
    const grossContributionPerUserLocal = DecimalMath.subtract(
      netRevenuePerUser,
      DecimalMath.add(estimatedAiCostPerUserLocal, gatewayFeePerUserLocal),
    );

    const grossMarginPercent =
      netRevenuePerUser > 0
        ? Number(((grossContributionPerUserLocal / netRevenuePerUser) * 100).toFixed(2))
        : 0;

    const isProfitable = grossContributionPerUserLocal > 0;

    // 5. Reporting Currency Conversion (Normalized to USD)
    const reportingFxQuote = this.fxRateService.getRateQuote(currency, 'USD');
    const grossContributionPerUserReporting = DecimalMath.multiply(
      grossContributionPerUserLocal,
      reportingFxQuote.rate,
    );

    return {
      countryCode,
      currency,
      basePrice,
      grossRevenuePerUser,
      taxAmountPerUser,
      netRevenuePerUser,
      estimatedAiCostPerUserUsd,
      estimatedAiCostPerUserLocal,
      gatewayFeePerUserLocal,
      grossContributionPerUserLocal,
      grossMarginPercent,
      isProfitable,
      totalMonthlyRevenueLocal: DecimalMath.multiply(grossRevenuePerUser, expectedUsers),
      totalMonthlyProfitLocal: DecimalMath.multiply(grossContributionPerUserLocal, expectedUsers),
      reportingCurrency: 'USD',
      grossContributionPerUserReporting,
    };
  }
}
