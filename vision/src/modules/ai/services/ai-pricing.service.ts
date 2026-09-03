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
  // ── DOCTOR PLANS ──
  doctor_plan_1: {
    id: 'doctor_plan_1',
    product_id: 'prod_doctor_ai',
    name: 'Doctor Starter',
    description: 'Essential clinical tools with prescription autocomplete and drug-food safety checks',
    billing_cycle: 'monthly',
    plan_type: 'subscription',
    included_monthly_credits: 25,
    bonus_credits: 0,
    rollover_unused_credits: false,
    is_active: true,
    is_public: true,
    plan_version: 1,
    features: ['DOCTOR_RX_AUTOCOMPLETE', 'DOCTOR_DRUG_SAFETY'],
    feature_limits: {
      DOCTOR_RX_AUTOCOMPLETE: { limit: 25, is_unlimited: false, unit: 'uses' },
      DOCTOR_DRUG_SAFETY: { limit: 25, is_unlimited: false, unit: 'uses' },
    },
    price_inr: 0,
    price_usd: 0,
  },
  doctor_plan_2: {
    id: 'doctor_plan_2',
    product_id: 'prod_doctor_ai',
    name: 'Doctor Pro',
    description: 'High-volume clinical workflow automation with pre-consult briefs and post-consult summaries',
    billing_cycle: 'monthly',
    plan_type: 'subscription',
    included_monthly_credits: 100,
    bonus_credits: 0,
    rollover_unused_credits: false,
    is_active: true,
    is_public: true,
    plan_version: 1,
    features: ['DOCTOR_RX_AUTOCOMPLETE', 'DOCTOR_DRUG_SAFETY', 'DOCTOR_PATIENT_BRIEF', 'DOCTOR_CONSULT_SUMMARY'],
    feature_limits: {
      DOCTOR_RX_AUTOCOMPLETE: { limit: 100, is_unlimited: false, unit: 'uses' },
      DOCTOR_DRUG_SAFETY: { limit: 100, is_unlimited: false, unit: 'uses' },
      DOCTOR_PATIENT_BRIEF: { limit: 100, is_unlimited: false, unit: 'uses' },
      DOCTOR_CONSULT_SUMMARY: { limit: 100, is_unlimited: false, unit: 'uses' },
    },
    price_inr: 1499,
    price_usd: 19,
  },
  doctor_plan_3: {
    id: 'doctor_plan_3',
    product_id: 'prod_doctor_ai',
    name: 'Doctor Premium',
    description: 'Full clinical intelligence with automated SOAP note generation and comprehensive practice documentation',
    billing_cycle: 'monthly',
    plan_type: 'subscription',
    included_monthly_credits: 300,
    bonus_credits: 0,
    rollover_unused_credits: false,
    is_active: true,
    is_public: true,
    plan_version: 1,
    features: ['DOCTOR_RX_AUTOCOMPLETE', 'DOCTOR_DRUG_SAFETY', 'DOCTOR_PATIENT_BRIEF', 'DOCTOR_CONSULT_SUMMARY', 'DOCTOR_SOAP_NOTES'],
    feature_limits: {
      DOCTOR_RX_AUTOCOMPLETE: { limit: 300, is_unlimited: false, unit: 'uses' },
      DOCTOR_DRUG_SAFETY: { limit: 300, is_unlimited: false, unit: 'uses' },
      DOCTOR_PATIENT_BRIEF: { limit: 300, is_unlimited: false, unit: 'uses' },
      DOCTOR_CONSULT_SUMMARY: { limit: 300, is_unlimited: false, unit: 'uses' },
      DOCTOR_SOAP_NOTES: { limit: 300, is_unlimited: false, unit: 'uses' },
    },
    price_inr: 2999,
    price_usd: 39,
  },

  // ── PATIENT PLANS ──
  patient_plan_1: {
    id: 'patient_plan_1',
    product_id: 'prod_patient_ai',
    name: 'Patient Basic',
    description: 'Free introductory cycle companion and women wellness educational guidance',
    billing_cycle: 'monthly',
    plan_type: 'subscription',
    included_monthly_credits: 15,
    bonus_credits: 0,
    rollover_unused_credits: false,
    is_active: true,
    is_public: true,
    plan_version: 1,
    features: ['PATIENT_CHAT'],
    feature_limits: {
      PATIENT_CHAT: { limit: 15, is_unlimited: false, unit: 'uses' },
    },
    price_inr: 0,
    price_usd: 0,
  },
  patient_plan_2: {
    id: 'patient_plan_2',
    product_id: 'prod_patient_ai',
    name: 'Patient Pro',
    description: 'Comprehensive health companion with AI lab report decoder and visit preparation briefs',
    billing_cycle: 'monthly',
    plan_type: 'subscription',
    included_monthly_credits: 60,
    bonus_credits: 0,
    rollover_unused_credits: false,
    is_active: true,
    is_public: true,
    plan_version: 1,
    features: ['PATIENT_CHAT', 'PATIENT_LAB_ANALYSIS', 'PATIENT_CONSULT_PREP'],
    feature_limits: {
      PATIENT_CHAT: { limit: 60, is_unlimited: false, unit: 'uses' },
      PATIENT_LAB_ANALYSIS: { limit: 60, is_unlimited: false, unit: 'uses' },
      PATIENT_CONSULT_PREP: { limit: 60, is_unlimited: false, unit: 'uses' },
    },
    price_inr: 499,
    price_usd: 7,
  },
  patient_plan_3: {
    id: 'patient_plan_3',
    product_id: 'prod_patient_ai',
    name: 'Patient Premium',
    description: 'Continuous VIP care with unlimited in-depth symptom analysis and priority health guidance',
    billing_cycle: 'monthly',
    plan_type: 'subscription',
    included_monthly_credits: 150,
    bonus_credits: 0,
    rollover_unused_credits: false,
    is_active: true,
    is_public: true,
    plan_version: 1,
    features: ['PATIENT_CHAT', 'PATIENT_LAB_ANALYSIS', 'PATIENT_CONSULT_PREP'],
    feature_limits: {
      PATIENT_CHAT: { limit: 150, is_unlimited: false, unit: 'uses' },
      PATIENT_LAB_ANALYSIS: { limit: 150, is_unlimited: false, unit: 'uses' },
      PATIENT_CONSULT_PREP: { limit: 150, is_unlimited: false, unit: 'uses' },
    },
    price_inr: 999,
    price_usd: 14,
  },
};

// Aliases for backwards compatibility
DEFAULT_PLANS['doctor_free'] = DEFAULT_PLANS['doctor_plan_1'];
DEFAULT_PLANS['doctor_pro'] = DEFAULT_PLANS['doctor_plan_2'];
DEFAULT_PLANS['patient_free'] = DEFAULT_PLANS['patient_plan_1'];
DEFAULT_PLANS['patient_premium'] = DEFAULT_PLANS['patient_plan_2'];

export const DEFAULT_REGIONAL_PRICES: Record<string, Record<string, { amount: number; currency: string }>> = {
  doctor_plan_1: {
    IN: { amount: 0.0, currency: 'INR' },
    US: { amount: 0.0, currency: 'USD' },
  },
  doctor_plan_2: {
    IN: { amount: 1499.0, currency: 'INR' },
    US: { amount: 19.0, currency: 'USD' },
  },
  doctor_plan_3: {
    IN: { amount: 2999.0, currency: 'INR' },
    US: { amount: 39.0, currency: 'USD' },
  },
  patient_plan_1: {
    IN: { amount: 0.0, currency: 'INR' },
    US: { amount: 0.0, currency: 'USD' },
  },
  patient_plan_2: {
    IN: { amount: 499.0, currency: 'INR' },
    US: { amount: 7.0, currency: 'USD' },
  },
  patient_plan_3: {
    IN: { amount: 999.0, currency: 'INR' },
    US: { amount: 14.0, currency: 'USD' },
  },
  // Backward compatibility aliases
  doctor_free: { IN: { amount: 0.0, currency: 'INR' }, US: { amount: 0.0, currency: 'USD' } },
  doctor_pro: { IN: { amount: 1499.0, currency: 'INR' }, US: { amount: 19.0, currency: 'USD' } },
  patient_free: { IN: { amount: 0.0, currency: 'INR' }, US: { amount: 0.0, currency: 'USD' } },
  patient_premium: { IN: { amount: 499.0, currency: 'INR' }, US: { amount: 7.0, currency: 'USD' } },
};

@Injectable()
export class AiPricingService {
  private readonly logger = new Logger(AiPricingService.name);
  private plansCache: Map<string, AiPlan> = new Map();
  private lastPlansCacheTime = 0;
  private readonly CACHE_TTL_MS = 60_000;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly fxRateService: FXRateService,
  ) {
    for (const [key, plan] of Object.entries(DEFAULT_PLANS)) {
      this.plansCache.set(key, { ...plan });
    }
  }

  /**
   * Fetches all plans from database with resilient in-memory fallback
   */
  async getAllPlans(): Promise<AiPlan[]> {
    const now = Date.now();
    if (this.plansCache.size > 0 && now - this.lastPlansCacheTime < this.CACHE_TTL_MS) {
      return Array.from(this.plansCache.values());
    }

    try {
      const { data, error } = await this.supabase.admin
        .from('ai_plans')
        .select('*');

      if (!error && data && data.length > 0) {
        this.plansCache.clear();
        for (const row of data) {
          const fallback = DEFAULT_PLANS[row.id] || {};
          const merged: AiPlan = {
            ...fallback,
            ...row,
            features: row.features || fallback.features || [],
            feature_limits: row.feature_limits || fallback.feature_limits || {},
          };
          this.plansCache.set(row.id, merged);
        }
        this.lastPlansCacheTime = now;
        return Array.from(this.plansCache.values());
      }
    } catch (err: any) {
      this.logger.warn(`Could not load ai_plans from database, using in-memory: ${err?.message}`);
    }

    return Array.from(this.plansCache.values());
  }

  /**
   * Fetches specific plan by ID
   */
  async getPlan(planId: string): Promise<AiPlan> {
    await this.getAllPlans();
    const found = this.plansCache.get(planId) || DEFAULT_PLANS[planId];
    if (found) return found;
    throw new NotFoundException(`AI Plan "${planId}" does not exist.`);
  }

  /**
   * Sets or updates explicit regional market price for a plan
   */
  async setRegionalPrice(
    planId: string,
    countryCode: string,
    currency: string,
    baseAmount: number,
    adminUser?: { id: string; name: string },
  ): Promise<AiRegionalPrice> {
    const cCode = countryCode.toUpperCase();
    const curr = currency.toUpperCase();
    const amount = Number(baseAmount || 0);

    // 1. Maintain in-memory fallback
    if (!DEFAULT_REGIONAL_PRICES[planId]) {
      DEFAULT_REGIONAL_PRICES[planId] = {};
    }
    DEFAULT_REGIONAL_PRICES[planId][cCode] = { amount, currency: curr };
    if (cCode === 'IN') {
      DEFAULT_REGIONAL_PRICES[planId]['IN'] = { amount, currency: 'INR' };
    } else if (cCode === 'US') {
      DEFAULT_REGIONAL_PRICES[planId]['US'] = { amount, currency: 'USD' };
    }

    // Also update cached plan
    const cached = this.plansCache.get(planId);
    if (cached) {
      if (curr === 'INR' || cCode === 'IN') cached.price_inr = amount;
      if (curr === 'USD' || cCode === 'US') cached.price_usd = amount;
      this.plansCache.set(planId, cached);
    }
    this.lastPlansCacheTime = 0; // force refresh

    // 2. Determine incremental price version within 32-bit integer limits
    let nextVersion = 1;
    try {
      const { data: latestPrice } = await this.supabase.admin
        .from('ai_regional_prices')
        .select('price_version')
        .eq('plan_id', planId)
        .eq('country_code', cCode)
        .eq('currency', curr)
        .order('price_version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestPrice && typeof latestPrice.price_version === 'number') {
        nextVersion = latestPrice.price_version + 1;
      }
    } catch {}

    const priceEntry: AiRegionalPrice = {
      plan_id: planId,
      country_code: cCode,
      currency: curr,
      base_amount: amount,
      price_version: nextVersion,
      is_active: true,
      effective_from: new Date().toISOString(),
      created_by: adminUser?.id || undefined,
    };

    try {
      await this.supabase.admin
        .from('ai_regional_prices')
        .update({ is_active: false })
        .eq('plan_id', planId)
        .eq('country_code', cCode)
        .eq('currency', curr);

      const { error } = await this.supabase.admin.from('ai_regional_prices').insert(priceEntry);
      if (error) {
        this.logger.warn(`Regional price DB insert warning: ${error.message}`);
      }

      await this.supabase.admin.from('ai_admin_audit_logs').insert({
        admin_id: adminUser?.id || null,
        admin_name: adminUser?.name || 'Admin',
        action: 'PRICE_UPDATED',
        entity_type: 'price',
        entity_id: `${planId}_${cCode}_${curr}`,
        new_value: priceEntry,
      });
    } catch (err: any) {
      this.logger.warn(`Could not save regional price to DB: ${err?.message}`);
    }

    return priceEntry;
  }

  /**
   * Creates a new plan
   */
  async createPlan(dto: Partial<AiPlan>, adminUser?: { id: string; name: string }): Promise<AiPlan> {
    if (!dto.name?.trim()) {
      throw new BadRequestException('Plan name is required');
    }

    let planId = dto.id?.trim().toLowerCase();
    if (!planId) {
      planId = dto.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    }

    const newPlan: AiPlan = {
      id: planId,
      product_id: dto.product_id || 'prod_patient_ai',
      name: dto.name.trim(),
      description: dto.description?.trim() || '',
      billing_cycle: dto.billing_cycle || 'monthly',
      plan_type: dto.plan_type || 'subscription',
      included_monthly_credits: Number(dto.included_monthly_credits || 0),
      bonus_credits: Number(dto.bonus_credits || 0),
      rollover_unused_credits: Boolean(dto.rollover_unused_credits),
      is_active: dto.is_active ?? true,
      is_public: dto.is_public ?? true,
      plan_version: 1,
      features: dto.features || [],
      feature_limits: dto.feature_limits || {},
      price_inr: dto.price_inr !== undefined ? Number(dto.price_inr) : undefined,
      price_usd: dto.price_usd !== undefined ? Number(dto.price_usd) : undefined,
    };

    if (dto.price_inr !== undefined && dto.price_inr !== null) {
      await this.setRegionalPrice(planId, 'IN', 'INR', Number(dto.price_inr), adminUser);
    }
    if (dto.price_usd !== undefined && dto.price_usd !== null) {
      await this.setRegionalPrice(planId, 'US', 'USD', Number(dto.price_usd), adminUser);
    }

    this.plansCache.set(planId, newPlan);
    this.lastPlansCacheTime = 0;

    try {
      const dbPlan = {
        id: planId,
        product_id: newPlan.product_id,
        name: newPlan.name,
        description: newPlan.description,
        billing_cycle: newPlan.billing_cycle,
        plan_type: newPlan.plan_type,
        included_monthly_credits: newPlan.included_monthly_credits,
        bonus_credits: newPlan.bonus_credits,
        rollover_unused_credits: newPlan.rollover_unused_credits,
        is_active: newPlan.is_active,
        is_public: newPlan.is_public,
        plan_version: newPlan.plan_version,
        features: newPlan.features,
        feature_limits: newPlan.feature_limits,
      };

      await this.supabase.admin.from('ai_plans').upsert(dbPlan, { onConflict: 'id' });

      await this.supabase.admin.from('ai_admin_audit_logs').insert({
        admin_id: adminUser?.id || null,
        admin_name: adminUser?.name || 'Admin',
        action: 'AI_PLAN_CREATED',
        entity_type: 'plan',
        entity_id: planId,
        old_value: null,
        new_value: newPlan,
        reason: `Admin created plan ${newPlan.name}`,
      });
    } catch (err: any) {
      this.logger.warn(`Failed to insert plan in database: ${err?.message}`);
    }

    return newPlan;
  }

  /**
   * Updates an existing plan
   */
  async updatePlan(
    planId: string,
    updates: Partial<AiPlan>,
    adminUser?: { id: string; name: string },
  ): Promise<AiPlan> {
    const current = await this.getPlan(planId);
    const updated: AiPlan = {
      ...current,
      ...updates,
      id: planId,
      included_monthly_credits: updates.included_monthly_credits !== undefined 
        ? Number(updates.included_monthly_credits) 
        : current.included_monthly_credits,
      bonus_credits: updates.bonus_credits !== undefined 
        ? Number(updates.bonus_credits) 
        : current.bonus_credits,
      rollover_unused_credits: updates.rollover_unused_credits !== undefined 
        ? Boolean(updates.rollover_unused_credits) 
        : current.rollover_unused_credits,
      plan_version: (current.plan_version || 1) + 1,
    };

    if (updates.price_inr !== undefined && updates.price_inr !== null) {
      await this.setRegionalPrice(planId, 'IN', 'INR', Number(updates.price_inr), adminUser);
      updated.price_inr = Number(updates.price_inr);
    }
    if (updates.price_usd !== undefined && updates.price_usd !== null) {
      await this.setRegionalPrice(planId, 'US', 'USD', Number(updates.price_usd), adminUser);
      updated.price_usd = Number(updates.price_usd);
    }

    this.plansCache.set(planId, updated);
    this.lastPlansCacheTime = 0;

    try {
      const dbPlan = {
        id: planId,
        product_id: updated.product_id,
        name: updated.name,
        description: updated.description,
        billing_cycle: updated.billing_cycle,
        plan_type: updated.plan_type,
        included_monthly_credits: updated.included_monthly_credits,
        bonus_credits: updated.bonus_credits,
        rollover_unused_credits: updated.rollover_unused_credits,
        is_active: updated.is_active,
        is_public: updated.is_public,
        plan_version: updated.plan_version,
        features: updated.features,
        feature_limits: updated.feature_limits,
        updated_at: new Date().toISOString(),
      };

      await this.supabase.admin.from('ai_plans').upsert(dbPlan, { onConflict: 'id' });

      await this.supabase.admin.from('ai_admin_audit_logs').insert({
        admin_id: adminUser?.id || null,
        admin_name: adminUser?.name || 'Admin',
        action: 'AI_PLAN_UPDATED',
        entity_type: 'plan',
        entity_id: planId,
        old_value: current,
        new_value: updated,
        reason: `Admin updated plan ${updated.name}`,
      });
    } catch (err: any) {
      this.logger.warn(`Failed to update plan in database: ${err?.message}`);
    }

    return updated;
  }

  /**
   * Deactivates a plan
   */
  async deletePlan(planId: string, adminUser?: { id: string; name: string }): Promise<void> {
    const current = await this.getPlan(planId);
    const updated: AiPlan = { ...current, is_active: false };

    this.plansCache.set(planId, updated);
    this.lastPlansCacheTime = Date.now();

    try {
      await this.supabase.admin.from('ai_plans').upsert(updated, { onConflict: 'id' });

      await this.supabase.admin.from('ai_admin_audit_logs').insert({
        admin_id: adminUser?.id || null,
        admin_name: adminUser?.name || 'Admin',
        action: 'AI_PLAN_DEACTIVATED',
        entity_type: 'plan',
        entity_id: planId,
        old_value: current,
        new_value: updated,
        reason: `Admin deactivated plan ${current.name}`,
      });
    } catch (err: any) {
      this.logger.warn(`Failed to deactivate plan in database: ${err?.message}`);
    }
  }

  /**
   * Resolves country and currency from user profile or explicit request
   */
  resolveCountryAndCurrency(
    user?: AuthUser | null,
    explicitCountry?: string,
    explicitCurrency?: string,
  ): { countryCode: string; currencyCode: string } {
    const countryCode = (explicitCountry || user?.profile?.country || 'IN').toUpperCase().trim();
    let currencyCode = (
      explicitCurrency ||
      user?.profile?.currency ||
      (countryCode === 'IN' ? 'INR' : 'USD')
    ).toUpperCase().trim();

    if (currencyCode !== 'INR' && currencyCode !== 'USD') {
      currencyCode = countryCode === 'IN' ? 'INR' : 'USD';
    }

    return { countryCode, currencyCode };
  }

  /**
   * Fetches Country Config
   */
  async getCountry(countryCode: string): Promise<CountryConfig> {
    const code = (countryCode || 'IN').toUpperCase().trim();
    const isIndia = code === 'IN';
    try {
      const { data, error } = await this.supabase.admin
        .from('countries')
        .select('*')
        .eq('code', code)
        .maybeSingle();

      if (!error && data) {
        return {
          ...data,
          default_currency: isIndia ? 'INR' : 'USD',
          supported_currencies: [isIndia ? 'INR' : 'USD'],
          payment_gateway: isIndia ? 'cashfree' : 'stripe',
        } as CountryConfig;
      }
    } catch {}

    const fallback = DEFAULT_COUNTRIES[code];
    if (fallback) return fallback;

    return {
      code,
      name: isIndia ? 'India' : `International (${code})`,
      region: isIndia ? 'Asia' : 'Global',
      default_currency: isIndia ? 'INR' : 'USD',
      supported_currencies: [isIndia ? 'INR' : 'USD'],
      timezone: isIndia ? 'Asia/Kolkata' : 'UTC',
      locale: isIndia ? 'en-IN' : 'en-US',
      phone_prefix: isIndia ? '+91' : '+1',
      tax_rate: isIndia ? 18.0 : 0.0,
      tax_name: isIndia ? 'GST' : 'Sales Tax',
      tax_type: isIndia ? 'inclusive' : 'exclusive',
      payment_gateway: isIndia ? 'cashfree' : 'stripe',
      is_active: true,
      is_ai_enabled: true,
    };
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
    const normalizedCountry = (countryCode || 'IN').toUpperCase().trim();
    let normalizedCurrency = (currencyCode || (normalizedCountry === 'IN' ? 'INR' : 'USD')).toUpperCase().trim();
    if (normalizedCurrency !== 'INR' && normalizedCurrency !== 'USD') {
      normalizedCurrency = normalizedCountry === 'IN' ? 'INR' : 'USD';
    }

    const country = await this.getCountry(normalizedCountry);
    const plan = await this.getPlan(planId);
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
        .eq('currency', normalizedCurrency)
        .eq('is_active', true)
        .order('price_version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (priceRow) {
        baseAmount = Number(priceRow.base_amount);
        priceVersion = priceRow.price_version;
      } else {
        const regionalKey = normalizedCurrency === 'USD' ? 'US' : 'IN';
        const fallback = DEFAULT_REGIONAL_PRICES[planId]?.[regionalKey] ||
          DEFAULT_REGIONAL_PRICES[planId]?.IN || { amount: 0, currency: normalizedCurrency };
        baseAmount = fallback.amount;
      }
    } catch {
      const regionalKey = normalizedCurrency === 'USD' ? 'US' : 'IN';
      const fallback = DEFAULT_REGIONAL_PRICES[planId]?.[regionalKey] ||
        DEFAULT_REGIONAL_PRICES[planId]?.IN || { amount: 0, currency: normalizedCurrency };
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
      const coupon = await this.validateCoupon(couponCode, planId, country.code, normalizedCurrency);
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

    let priceInr = DEFAULT_REGIONAL_PRICES[planId]?.IN?.amount ?? (planId.includes('free') ? 0 : 999);
    let priceUsd = DEFAULT_REGIONAL_PRICES[planId]?.US?.amount ?? (planId.includes('free') ? 0 : 19);

    try {
      const { data: allPrices } = await this.supabase.admin
        .from('ai_regional_prices')
        .select('currency, base_amount')
        .eq('plan_id', planId)
        .eq('is_active', true)
        .order('price_version', { ascending: false });

      if (allPrices && allPrices.length > 0) {
        const foundInr = allPrices.find((p) => p.currency === 'INR');
        if (foundInr) priceInr = Number(foundInr.base_amount);
        const foundUsd = allPrices.find((p) => p.currency === 'USD');
        if (foundUsd) priceUsd = Number(foundUsd.base_amount);
      }
    } catch {}

    const currMeta = DEFAULT_CURRENCIES[normalizedCurrency] || DEFAULT_CURRENCIES.INR;

    return {
      planId: plan.id,
      planName: plan.name,
      countryCode: country.code,
      countryName: country.name,
      currency: normalizedCurrency,
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
      billing_cycle: plan.billing_cycle,
      includedCredits: Number(plan.included_monthly_credits || 0) + Number(plan.bonus_credits || 0),
      included_monthly_credits: Number(plan.included_monthly_credits || 0),
      bonus_credits: Number(plan.bonus_credits || 0),
      rollover_unused_credits: Boolean(plan.rollover_unused_credits),
      product_id: plan.product_id,
      is_public: plan.is_public ?? true,
      features: plan.features || [],
      feature_limits: plan.feature_limits || {},
      is_active: plan.is_active,
      description: plan.description,
      price_inr: priceInr,
      price_usd: priceUsd,
      gateway: country.payment_gateway,
    };
  }

  /**
   * Fetches all plans for a country/currency
   */
  async getAllPlansForMarket(
    countryCode = 'IN',
    currencyCode = 'INR',
    role?: 'patient' | 'doctor',
    includeInactive = false,
  ): Promise<AiResolvedPriceQuote[]> {
    const normalizedCountry = (countryCode || 'IN').toUpperCase().trim();
    let normalizedCurrency = (currencyCode || (normalizedCountry === 'IN' ? 'INR' : 'USD')).toUpperCase().trim();
    if (normalizedCurrency !== 'INR' && normalizedCurrency !== 'USD') {
      normalizedCurrency = normalizedCountry === 'IN' ? 'INR' : 'USD';
    }

    const allPlans = await this.getAllPlans();
    const plans = allPlans.filter(
      (p) => (includeInactive || p.is_active) && (!role || p.product_id.includes(role)),
    );

    const quotes: AiResolvedPriceQuote[] = [];
    for (const p of plans) {
      const quote = await this.getPricingQuote(p.id, normalizedCountry, normalizedCurrency);
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
