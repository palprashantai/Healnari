import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { CashfreeService } from '@/core/cashfree/cashfree.service';
import { FXRateService } from '@/core/fx/fx-rate.service';
import { AiPricingService } from './ai-pricing.service';
import { AiCreditLedgerService } from './ai-credit-ledger.service';
import {
  AiSubscription,
  AiPlanId,
} from '@/modules/ai/interfaces/ai-monetization.interface';
import type { AuthUser } from '@/core/decorators/current-user.decorator';

export const AI_PLANS = {
  [AiPlanId.PATIENT_FREE]: {
    id: AiPlanId.PATIENT_FREE,
    role: 'patient',
    name: 'HealNari Standard',
    price: 0,
    currency: 'INR',
    monthlyCredits: 5,
    features: [
      '5 AI Health Companion questions / month',
      'Basic symptom guide',
      'Cycle tracking integrations',
    ],
  },
  [AiPlanId.PATIENT_PREMIUM]: {
    id: AiPlanId.PATIENT_PREMIUM,
    role: 'patient',
    name: 'HealNari AI Premium',
    priceMonthly: 299,
    priceYearly: 2499,
    currency: 'INR',
    monthlyCredits: 200,
    features: [
      'Unlimited AI Lab Report Explanations with cycle-phase calibration',
      'AI Consultation Preparation & personalized questions for doctor',
      '200 AI Health Companion inquiries / month',
      'Hormone biomarker trend insights & safety tips',
      'Priority LLM processing',
    ],
  },
  [AiPlanId.DOCTOR_FREE]: {
    id: AiPlanId.DOCTOR_FREE,
    role: 'doctor',
    name: 'Doctor Standard',
    price: 0,
    currency: 'INR',
    monthlyCredits: 10,
    features: [
      '10 Smart Rx autocompletions / month',
      '10 Drug-food safety checks / month',
    ],
  },
  [AiPlanId.DOCTOR_PRO]: {
    id: AiPlanId.DOCTOR_PRO,
    role: 'doctor',
    name: 'Doctor AI Pro',
    priceMonthly: 999,
    priceYearly: 8999,
    currency: 'INR',
    monthlyCredits: 150,
    features: [
      'AI Patient Brief before every consultation',
      '50 AI SOAP Note generations / month with vector RAG protocols',
      'AI Post-Consultation Patient Action Plan & summaries',
      'Unlimited smart prescription autocomplete & drug-interaction safety',
      'Saved 15+ minutes per patient consultation',
    ],
  },
};

@Injectable()
export class AiSubscriptionService {
  private readonly logger = new Logger(AiSubscriptionService.name);
  private readonly inMemorySubscriptions: Map<string, AiSubscription> = new Map();
  private readonly inMemoryTransactions: Map<string, any[]> = new Map();

  constructor(
    private readonly supabase: SupabaseService,
    private readonly cashfree: CashfreeService,
    private readonly pricingService: AiPricingService,
    private readonly creditLedgerService: AiCreditLedgerService,
    private readonly fxRateService: FXRateService,
  ) {}

  /**
   * Retrieves user's active AI subscription or generates standard free tier.
   */
  async getSubscription(user: AuthUser): Promise<AiSubscription> {
    const isDoctor = user.profile.role === 'doctor';
    const defaultPlan = isDoctor ? AiPlanId.DOCTOR_FREE : AiPlanId.PATIENT_FREE;
    const defaultCredits = isDoctor ? 10 : 5;

    try {
      const { data, error } = await this.supabase.admin
        .from('ai_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        return data as AiSubscription;
      }
    } catch {}

    const mem = this.inMemorySubscriptions.get(user.id);
    if (mem) return mem;

    const defaultSub: AiSubscription = {
      id: `sub_${user.id.slice(0, 8)}`,
      user_id: user.id,
      plan_id: defaultPlan,
      role: user.profile.role,
      status: 'active',
      billing_cycle: 'monthly',
      current_period_start: new Date().toISOString(),
      current_period_end: null,
      monthly_ai_credits: defaultCredits,
      credits_used: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.inMemorySubscriptions.set(user.id, defaultSub);
    return defaultSub;
  }

  /**
   * Deducts credits or records usage.
   */
  async deductCredits(user: AuthUser, count = 1): Promise<AiSubscription> {
    const current = await this.getSubscription(user);
    const updated: AiSubscription = {
      ...current,
      credits_used: (current.credits_used || 0) + count,
      updated_at: new Date().toISOString(),
    };

    this.inMemorySubscriptions.set(user.id, updated);

    // Also deduct via double-entry credit ledger
    await this.creditLedgerService.consumeCredits(
      user.id,
      count,
      'AI_INQUIRY',
      `sub_${Date.now()}`,
    );

    try {
      await this.supabase.admin
        .from('ai_subscriptions')
        .upsert(updated, { onConflict: 'user_id' });
    } catch {}

    return updated;
  }

  /**
   * Initiates payment order via Cashfree or Stripe to upgrade to AI Premium or Doctor AI Pro.
   * Multi-Currency & Regional Pricing Aware.
   */
  async initiateUpgrade(
    user: AuthUser,
    targetPlanId: string,
    billingCycle: 'monthly' | 'yearly' = 'monthly',
    couponCode?: string,
    explicitCountry?: string,
    explicitCurrency?: string,
  ): Promise<{
    orderId: string;
    paymentSessionId?: string;
    amount: number;
    currency: string;
    planName: string;
    gateway: string;
    taxAmount: number;
    discountAmount: number;
    finalAmount: number;
  }> {
    const { countryCode, currencyCode } = this.pricingService.resolveCountryAndCurrency(
      user,
      explicitCountry,
      explicitCurrency,
    );

    // Get authoritative price quote
    const effectivePlanId =
      billingCycle === 'yearly' && !targetPlanId.includes('yearly')
        ? `${targetPlanId}_yearly`
        : targetPlanId;

    const quote = await this.pricingService.getPricingQuote(
      effectivePlanId,
      countryCode,
      currencyCode,
      couponCode,
    );

    const orderId = `ai_sub_${user.id.slice(0, 8)}_${Date.now()}`;

    // If Indian Rupee and Cashfree configured, initiate Cashfree order
    if (currencyCode === 'INR' && this.cashfree.isConfigured) {
      try {
        const order = await this.cashfree.createOrder({
          orderId,
          amount: quote.finalAmount,
          currency: 'INR',
          customerId: user.id,
          customerName: user.profile.full_name || 'HealNari User',
          customerEmail: user.email || 'user@healnari.app',
          customerPhone: user.profile.phone || '9999999999',
          note: `HealNari AI Subscription: ${quote.planName} (${billingCycle})`,
        });

        return {
          orderId,
          paymentSessionId: order.payment_session_id,
          amount: quote.baseAmount,
          currency: quote.currency,
          planName: quote.planName,
          gateway: 'cashfree',
          taxAmount: quote.taxAmount,
          discountAmount: quote.discountAmount,
          finalAmount: quote.finalAmount,
        };
      } catch (err: any) {
        this.logger.warn(`Cashfree order creation failed for AI sub: ${err?.message}`);
      }
    }

    // Default multi-currency checkout (Stripe or Sandbox)
    return {
      orderId,
      amount: quote.baseAmount,
      currency: quote.currency,
      planName: quote.planName,
      gateway: quote.gateway,
      taxAmount: quote.taxAmount,
      discountAmount: quote.discountAmount,
      finalAmount: quote.finalAmount,
    };
  }

  /**
   * Activates AI subscription upon verified payment.
   * Grants credits to ledger, updates subscription, and logs immutable transaction.
   */
  async activateSubscription(
    user: AuthUser,
    planId: string,
    billingCycle: 'monthly' | 'yearly' = 'monthly',
    paymentReference?: string,
    countryCode = 'IN',
    currencyCode = 'INR',
    couponCode?: string,
  ): Promise<AiSubscription> {
    const effectivePlanId =
      billingCycle === 'yearly' && !planId.includes('yearly')
        ? `${planId}_yearly`
        : planId;

    const quote = await this.pricingService.getPricingQuote(
      effectivePlanId,
      countryCode,
      currencyCode,
      couponCode,
    );

    const isDoctor = user.profile.role === 'doctor';
    const isPro = effectivePlanId.includes('pro') || effectivePlanId.includes('premium');
    const monthlyCredits = quote.includedCredits || (isDoctor ? (isPro ? 150 : 10) : isPro ? 200 : 5);

    const days = billingCycle === 'yearly' ? 365 : 30;
    const now = new Date();
    const endDate = new Date(now.getTime() + days * 24 * 3600 * 1000);
    const orderId = paymentReference || `pay_${Date.now()}`;

    const subscription: AiSubscription = {
      id: `sub_${user.id.slice(0, 8)}`,
      user_id: user.id,
      plan_id: planId,
      role: user.profile.role,
      status: 'active',
      billing_cycle: billingCycle,
      current_period_start: now.toISOString(),
      current_period_end: endDate.toISOString(),
      monthly_ai_credits: monthlyCredits,
      credits_used: 0,
      payment_reference: orderId,
      currency: quote.currency === 'USD' ? 'USD' : 'INR',
      amount: quote.finalAmount,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    this.inMemorySubscriptions.set(user.id, subscription);

    // Grant credits in double-entry ledger
    await this.creditLedgerService.grantCredits(
      user.id,
      monthlyCredits,
      `AI Subscription Activated: ${quote.planName} (${billingCycle})`,
      orderId,
      'GRANT',
    );

    // Calculate reporting currency normalization
    const reportingConv = this.fxRateService.convert(quote.finalAmount, quote.currency, 'USD');

      const txRecord = {
        id: `txn_${Date.now()}`,
        user_id: user.id,
        plan_id: planId,
        country_code: countryCode,
        original_currency: quote.currency,
        base_amount: quote.baseAmount,
        tax_rate: quote.taxRate,
        tax_amount: quote.taxAmount,
        discount_amount: quote.discountAmount,
        final_amount: quote.finalAmount,
        reporting_currency: 'USD',
        reporting_amount: reportingConv.reportingAmount,
        fx_rate_applied: reportingConv.fxRate,
        gateway: quote.gateway,
        gateway_txn_id: orderId,
        status: 'paid',
        coupon_code: couponCode || null,
        created_at: now.toISOString(),
      };

      const userTxs = this.inMemoryTransactions.get(user.id) || [];
      userTxs.unshift(txRecord);
      this.inMemoryTransactions.set(user.id, userTxs);

      try {
        await this.supabase.admin
          .from('ai_subscriptions')
          .upsert(subscription, { onConflict: 'user_id' });

        // Record immutable financial transaction
        await this.supabase.admin.from('ai_transactions').insert(txRecord);
      } catch (err: any) {
        this.logger.warn(`Failed to save ai_subscription or transaction: ${err?.message}`);
      }

      return subscription;
    }

  /**
   * Retrieves all AI billing history / invoices for the user
   */
  async getBillingHistory(userId: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase.admin
        .from('ai_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data;
      }
    } catch {}

    const inMem = this.inMemoryTransactions.get(userId);
    if (inMem && inMem.length > 0) {
      return inMem;
    }

    // Default complimentary starter invoice for first-time visibility
    return [
      {
        id: `txn_init_${userId.slice(0, 8)}`,
        user_id: userId,
        plan_id: 'standard_free',
        country_code: 'IN',
        original_currency: 'INR',
        base_amount: 0,
        tax_rate: 0,
        tax_amount: 0,
        discount_amount: 0,
        final_amount: 0,
        gateway: 'complimentary',
        gateway_txn_id: `welcome_${userId.slice(0, 6)}`,
        status: 'paid',
        created_at: new Date().toISOString(),
      },
    ];
  }

  /**
   * Cancels AI subscription at period end (preserves access until current_period_end)
   */
  async cancelSubscription(user: AuthUser): Promise<AiSubscription> {
    const current = await this.getSubscription(user);
    const updated: AiSubscription = {
      ...current,
      cancel_at_period_end: true,
      status: 'active', // Retain full access until end of paid billing cycle!
      updated_at: new Date().toISOString(),
    };
    this.inMemorySubscriptions.set(user.id, updated);

    try {
      await this.supabase.admin
        .from('ai_subscriptions')
        .upsert(updated, { onConflict: 'user_id' });
    } catch {}

    return updated;
  }

  /**
   * Resumes a previously cancelled AI subscription before period end
   */
  async resumeSubscription(user: AuthUser): Promise<AiSubscription> {
    const current = await this.getSubscription(user);
    const updated: AiSubscription = {
      ...current,
      cancel_at_period_end: false,
      status: 'active',
      updated_at: new Date().toISOString(),
    };
    this.inMemorySubscriptions.set(user.id, updated);

    try {
      await this.supabase.admin
        .from('ai_subscriptions')
        .upsert(updated, { onConflict: 'user_id' });
    } catch {}

    return updated;
  }

  /**
   * Purchases an instant AI token top-up pack (e.g. 100, 500, 1000 tokens)
   */
  async buyTokenPack(
    user: AuthUser,
    packId: string,
    paymentReference?: string,
    currencyCode = 'INR',
  ): Promise<{ balance: number; tokensAdded: number; transaction: any }> {
    const currency: 'INR' | 'USD' = (currencyCode || 'INR').toUpperCase().trim() === 'USD' ? 'USD' : 'INR';
    const isUsd = currency === 'USD';

    const PACK_CONFIGS: Record<
      string,
      { tokens: number; priceInr: number; priceUsd: number; name: string }
    > = {
      pack_100: { tokens: 100, priceInr: 199, priceUsd: 5.0, name: '100 AI Tokens Pack' },
      pack_500: { tokens: 500, priceInr: 699, priceUsd: 15.0, name: '500 AI Tokens Pack' },
      pack_1000: { tokens: 1000, priceInr: 1199, priceUsd: 25.0, name: '1,000 AI Tokens Pack' },
    };

    const pack = PACK_CONFIGS[packId] || PACK_CONFIGS.pack_100;
    const baseAmount = isUsd ? pack.priceUsd : pack.priceInr;
    const taxRate = isUsd ? 0 : 18;
    const taxAmount = isUsd ? 0 : Number((baseAmount * 0.18).toFixed(2));
    const finalAmount = isUsd ? baseAmount : Number((baseAmount + taxAmount).toFixed(2));
    const countryCode = isUsd ? 'US' : 'IN';
    const orderId = paymentReference || `topup_${Date.now()}`;

    // Grant tokens into double-entry ledger
    const account = await this.creditLedgerService.grantCredits(
      user.id,
      pack.tokens,
      `AI Token Pack Top-Up: ${pack.name}`,
      orderId,
      'GRANT',
    );

    const tx = {
      id: `txn_${Date.now()}`,
      user_id: user.id,
      plan_id: packId,
      country_code: countryCode,
      original_currency: currency,
      base_amount: baseAmount,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      discount_amount: 0,
      final_amount: finalAmount,
      gateway: isUsd ? 'stripe' : 'cashfree',
      gateway_txn_id: orderId,
      status: 'paid',
      created_at: new Date().toISOString(),
    };

    const userTxs = this.inMemoryTransactions.get(user.id) || [];
    userTxs.unshift(tx);
    this.inMemoryTransactions.set(user.id, userTxs);

    try {
      await this.supabase.admin.from('ai_transactions').insert(tx);
    } catch {}

    return { balance: account.balance, tokensAdded: pack.tokens, transaction: tx };
  }

  /**
   * Cron Job: Resets monthly credits on 1st of every month.
   */
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async handleMonthlyCreditReset() {
    this.logger.log('Resetting monthly AI credits for all active users...');
    try {
      await this.supabase.admin
        .from('ai_subscriptions')
        .update({ credits_used: 0, updated_at: new Date().toISOString() })
        .eq('status', 'active');
    } catch (err: any) {
      this.logger.error(`Monthly AI credit reset error: ${err?.message}`);
    }
  }
}
