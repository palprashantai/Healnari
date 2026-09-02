import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as crypto from 'crypto';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { CashfreeService } from '@/core/cashfree/cashfree.service';
import { FXRateService } from '@/core/fx/fx-rate.service';
import { NotificationsService } from '@/modules/notifications/services/notifications.service';
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
    name: 'HealNari Free Companion',
    price: 0,
    currency: 'INR',
    monthlyCredits: 10,
    features: [
      '10 AI Health Companion questions / month',
      'Basic symptom guide',
      'Cycle tracking integrations',
    ],
  },
  [AiPlanId.PATIENT_PREMIUM]: {
    id: AiPlanId.PATIENT_PREMIUM,
    role: 'patient',
    name: 'HealNari AI Premium',
    priceMonthly: 999,
    priceYearly: 9999,
    currency: 'INR',
    monthlyCredits: 500,
    features: [
      'Unlimited AI Lab Report Explanations with cycle-phase calibration',
      'AI Consultation Preparation & personalized questions for doctor',
      'Unlimited AI Health Companion inquiries / month',
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
    monthlyCredits: 20,
    features: [
      '20 Smart Rx autocompletions / month',
      '20 Drug-food safety checks / month',
    ],
  },
  [AiPlanId.DOCTOR_PRO]: {
    id: AiPlanId.DOCTOR_PRO,
    role: 'doctor',
    name: 'Doctor AI Pro',
    priceMonthly: 1999,
    priceYearly: 19999,
    currency: 'INR',
    monthlyCredits: 1000,
    features: [
      'AI Patient Brief before every consultation',
      '50 AI SOAP Note generations / month with vector RAG protocols',
      'AI Post-Consultation Patient Action Plan & summaries',
      'Unlimited smart prescription autocomplete & drug-interaction safety',
      'Saved 15+ minutes per patient consultation',
    ],
  },
};

export const TOKEN_PACK_CONFIGS: Record<
  string,
  { tokens: number; priceInr: number; priceUsd: number; name: string }
> = {
  pack_100: { tokens: 100, priceInr: 199, priceUsd: 5.0, name: '100 AI Tokens Pack' },
  pack_500: { tokens: 500, priceInr: 699, priceUsd: 15.0, name: '500 AI Tokens Pack' },
  pack_1000: { tokens: 1000, priceInr: 1199, priceUsd: 25.0, name: '1,000 AI Tokens Pack' },
};

@Injectable()
export class AiSubscriptionService {
  private readonly logger = new Logger(AiSubscriptionService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly cashfree: CashfreeService,
    private readonly pricingService: AiPricingService,
    private readonly creditLedgerService: AiCreditLedgerService,
    private readonly fxRateService: FXRateService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Authoritatively retrieves user's active AI subscription from PostgreSQL database.
   * Auto-provisions free tier in database if no record exists.
   */
  async getSubscription(user: AuthUser): Promise<AiSubscription> {
    const isDoctor = user.profile.role === 'doctor';
    const defaultPlan = isDoctor ? AiPlanId.DOCTOR_FREE : AiPlanId.PATIENT_FREE;
    const defaultCredits = isDoctor ? 20 : 10;
    const country = (user.profile.country || 'IN').toUpperCase().trim();
    const currency = country === 'IN' ? 'INR' : 'USD';

    try {
      const { data, error } = await this.supabase.admin
        .from('ai_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        return data as AiSubscription;
      }
    } catch (err: any) {
      this.logger.warn(`Could not read ai_subscriptions: ${err?.message}`);
    }

    // Auto-provision initial standard free tier in DB
    const newSub: AiSubscription = {
      id: crypto.randomUUID(),
      user_id: user.id,
      plan_id: defaultPlan,
      role: user.profile.role,
      status: 'active',
      billing_cycle: 'monthly',
      current_period_start: new Date().toISOString(),
      current_period_end: null,
      monthly_ai_credits: defaultCredits,
      credits_used: 0,
      currency,
      amount: 0,
      cancel_at_period_end: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      const { data: created, error } = await this.supabase.admin
        .from('ai_subscriptions')
        .upsert(newSub, { onConflict: 'user_id' })
        .select()
        .single();
      if (!error && created) {
        return created as AiSubscription;
      }
    } catch (err: any) {
      this.logger.error(`Failed to auto-provision free subscription: ${err?.message}`);
    }

    return newSub;
  }

  /**
   * Deducts credits and records usage in the double-entry ledger and database.
   */
  async deductCredits(user: AuthUser, count = 1): Promise<AiSubscription> {
    const current = await this.getSubscription(user);
    const newCreditsUsed = (current.credits_used || 0) + count;

    // Deduct via double-entry credit ledger
    await this.creditLedgerService.consumeCredits(
      user.id,
      count,
      'AI_INQUIRY',
      `query_${Date.now()}`,
    );

    try {
      const { data, error } = await this.supabase.admin
        .from('ai_subscriptions')
        .update({
          credits_used: newCreditsUsed,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (!error && data) {
        return data as AiSubscription;
      }
    } catch (err: any) {
      this.logger.error(`Error updating subscription credit usage: ${err?.message}`);
    }

    return { ...current, credits_used: newCreditsUsed, updated_at: new Date().toISOString() };
  }

  /**
   * Initiates authoritative Cashfree payment order for AI Subscription upgrade.
   * STRICT TWO-CURRENCY POLICY:
   * - India users (country === 'IN') are strictly billed in INR.
   * - International users (country !== 'IN') are strictly billed in USD.
   * - Bypassing or manipulating currency from the client is rejected.
   */
  async initiateUpgrade(
    user: AuthUser,
    targetPlanId: string,
    billingCycle: 'monthly' | 'yearly' = 'monthly',
    couponCode?: string,
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
    // 1. Authoritative Currency & Country resolution (locked to user profile)
    const countryCode = (user.profile.country || 'IN').toUpperCase().trim();
    const currencyCode = countryCode === 'IN' ? 'INR' : 'USD';

    // 2. Authoritative Price Quote from Pricing Engine
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

    const orderId = `ai_sub_${user.id.replace(/-/g, '').slice(0, 8)}_${Date.now()}`;
    const notifyUrl = process.env.API_PUBLIC_URL
      ? `${process.env.API_PUBLIC_URL.replace(/\/$/, '')}/api/billing/webhook/cashfree`
      : undefined;

    let paymentSessionId: string | undefined = undefined;

    // 3. Create Real Cashfree Order (supports both INR and USD)
    if (this.cashfree.isConfigured && quote.finalAmount > 0) {
      try {
        const order = await this.cashfree.createOrder({
          orderId,
          amount: quote.finalAmount,
          currency: quote.currency,
          customerId: user.id,
          customerName: user.profile.full_name || 'HealNari User',
          customerEmail: user.email || 'patient@healnari.app',
          customerPhone: user.profile.phone || '9999999999',
          notifyUrl,
          note: `HealNari AI Plan: ${quote.planName} (${billingCycle})`,
        });

        paymentSessionId = order.payment_session_id;
      } catch (err: any) {
        this.logger.error(`Cashfree order creation failed for ${orderId}: ${err?.message}`);
        throw new BadRequestException(
          `Could not initiate payment session: ${err?.message || 'Gateway unavailable'}`,
        );
      }
    }

    // 4. Record Pending Financial Transaction in PostgreSQL
    const reportingConv = this.fxRateService.convert(quote.finalAmount, quote.currency, 'USD');
    const txRecord = {
      id: crypto.randomUUID(),
      user_id: user.id,
      plan_id: targetPlanId,
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
      gateway: 'cashfree',
      gateway_txn_id: orderId,
      status: 'pending',
      coupon_code: couponCode || null,
      created_at: new Date().toISOString(),
    };

    try {
      await this.supabase.admin.from('ai_transactions').insert(txRecord);
    } catch (err: any) {
      this.logger.warn(`Failed to insert pending ai_transaction: ${err?.message}`);
    }

    return {
      orderId,
      paymentSessionId,
      amount: quote.baseAmount,
      currency: quote.currency,
      planName: quote.planName,
      gateway: 'cashfree',
      taxAmount: quote.taxAmount,
      discountAmount: quote.discountAmount,
      finalAmount: quote.finalAmount,
    };
  }

  /**
   * Reconciles Cashfree payment status for an AI Subscription or Token Pack order.
   * This is the SINGLE SOURCE OF TRUTH:
   * - Called synchronously when user completes Drop-in checkout.
   * - Called asynchronously when Cashfree webhook arrives.
   * - Fully idempotent: repeated invocations do not duplicate credit grants.
   */
  async reconcileSubscriptionOrder(orderId: string): Promise<AiSubscription | null> {
    // 1. Find transaction record
    const { data: tx } = await this.supabase.admin
      .from('ai_transactions')
      .select('*')
      .eq('gateway_txn_id', orderId)
      .maybeSingle();

    if (!tx) {
      this.logger.warn(`Transaction not found for Cashfree order ${orderId}`);
      return null;
    }

    // Idempotent: If already settled, fetch and return authoritative subscription
    if (tx.status === 'paid') {
      const { data: sub } = await this.supabase.admin
        .from('ai_subscriptions')
        .select('*')
        .eq('user_id', tx.user_id)
        .maybeSingle();
      return sub as AiSubscription;
    }

    // 2. Fetch fresh, authoritative order state from Cashfree
    const order = await this.cashfree.getOrder(orderId);
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found on payment gateway.`);
    }

    if (order.order_status === 'PAID') {
      const expectedAmount = Number(tx.final_amount);
      const actualAmount = Number(order.order_amount || 0);
      const expectedCurrency = tx.original_currency;
      const actualCurrency = String(order.order_currency || 'INR').toUpperCase();

      if (expectedAmount !== actualAmount || expectedCurrency !== actualCurrency) {
        this.logger.error(
          `Gateway discrepancy on AI Order ${orderId}: Expected ${expectedAmount} ${expectedCurrency}, got ${actualAmount} ${actualCurrency}`,
        );
      }

      const { data: profile } = await this.supabase.admin
        .from('profiles')
        .select('role, full_name')
        .eq('id', tx.user_id)
        .maybeSingle();

      const role = profile?.role || 'patient';

      // ── CASE A: Token Pack Top-Up ──
      if (orderId.startsWith('ai_topup_')) {
        const packConfig = TOKEN_PACK_CONFIGS[tx.plan_id] || TOKEN_PACK_CONFIGS.pack_100;
        await this.creditLedgerService.grantCredits(
          tx.user_id,
          packConfig.tokens,
          `AI Token Pack Top-Up: ${packConfig.name}`,
          orderId,
          'GRANT',
        );

        await this.supabase.admin
          .from('ai_transactions')
          .update({ status: 'paid', updated_at: new Date().toISOString() })
          .eq('id', tx.id);

        await this.notifications.create(tx.user_id, {
          type: 'credits_added',
          title: 'AI Tokens Added',
          message: `Successfully added ${packConfig.tokens} AI tokens to your balance.`,
          data: { orderId, tokens: packConfig.tokens },
        }).catch(() => {});

        const { data: currentSub } = await this.supabase.admin
          .from('ai_subscriptions')
          .select('*')
          .eq('user_id', tx.user_id)
          .maybeSingle();
        return currentSub as AiSubscription;
      }

      // ── CASE B: AI Subscription Plan Upgrade ──
      const billingCycle = tx.plan_id.includes('yearly') ? 'yearly' : 'monthly';
      const quote = await this.pricingService.getPricingQuote(
        tx.plan_id,
        tx.country_code,
        tx.original_currency,
        tx.coupon_code || undefined,
      );

      const isDoctor = role === 'doctor';
      const isPro = tx.plan_id.includes('pro') || tx.plan_id.includes('premium');
      const monthlyCredits =
        quote.includedCredits || (isDoctor ? (isPro ? 1000 : 20) : isPro ? 500 : 10);

      const days = billingCycle === 'yearly' ? 365 : 30;
      const now = new Date();
      const endDate = new Date(now.getTime() + days * 86400000);

      const subscriptionRow = {
        user_id: tx.user_id,
        plan_id: tx.plan_id,
        role,
        status: 'active',
        billing_cycle: billingCycle,
        current_period_start: now.toISOString(),
        current_period_end: endDate.toISOString(),
        monthly_ai_credits: monthlyCredits,
        credits_used: 0,
        payment_reference: orderId,
        currency: tx.original_currency,
        amount: tx.final_amount,
        cancel_at_period_end: false,
        updated_at: now.toISOString(),
      };

      const { data: updatedSub, error: subError } = await this.supabase.admin
        .from('ai_subscriptions')
        .upsert(subscriptionRow, { onConflict: 'user_id' })
        .select()
        .single();

      if (subError) {
        this.logger.error(`Failed to update ai_subscriptions: ${subError.message}`);
      }

      // Grant credits to double-entry ledger
      await this.creditLedgerService.grantCredits(
        tx.user_id,
        monthlyCredits,
        `AI Subscription Activated: ${quote.planName} (${billingCycle})`,
        orderId,
        'GRANT',
      );

      // Settle transaction record
      await this.supabase.admin
        .from('ai_transactions')
        .update({ status: 'paid', updated_at: new Date().toISOString() })
        .eq('id', tx.id);

      // Deliver in-app notification
      await this.notifications.create(tx.user_id, {
        type: 'subscription_activated',
        title: 'Plan Activated',
        message: `Your subscription to ${quote.planName} is active with ${monthlyCredits} AI credits.`,
        data: { orderId, planId: tx.plan_id },
      }).catch(() => {});

      return (updatedSub || subscriptionRow) as AiSubscription;
    }

    if (order.order_status === 'FAILED' || order.order_status === 'CANCELLED') {
      await this.supabase.admin
        .from('ai_transactions')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', tx.id);
    }

    const { data: currentSub } = await this.supabase.admin
      .from('ai_subscriptions')
      .select('*')
      .eq('user_id', tx.user_id)
      .maybeSingle();

    return currentSub as AiSubscription;
  }

  /**
   * Verified activation endpoint — verifies paymentReference with Cashfree.
   * If payment is not completed, rejects rather than blindly trusting the frontend.
   */
  async activateSubscription(
    user: AuthUser,
    planId: string,
    billingCycle: 'monthly' | 'yearly' = 'monthly',
    paymentReference?: string,
  ): Promise<AiSubscription> {
    if (!paymentReference) {
      throw new BadRequestException('A valid payment reference is required to verify activation.');
    }

    const result = await this.reconcileSubscriptionOrder(paymentReference);
    if (!result || result.status !== 'active') {
      throw new BadRequestException(
        'Payment has not been confirmed by the gateway. Please complete the checkout process.',
      );
    }
    return result;
  }

  /**
   * Initiates payment order for an instant AI token top-up pack.
   */
  async initiateTokenPack(
    user: AuthUser,
    packId: string,
  ): Promise<{
    orderId: string;
    paymentSessionId?: string;
    amount: number;
    currency: string;
    packName: string;
    tokens: number;
  }> {
    const country = (user.profile.country || 'IN').toUpperCase().trim();
    const currency = country === 'IN' ? 'INR' : 'USD';
    const isUsd = currency === 'USD';

    const pack = TOKEN_PACK_CONFIGS[packId] || TOKEN_PACK_CONFIGS.pack_100;
    const baseAmount = isUsd ? pack.priceUsd : pack.priceInr;
    const taxRate = isUsd ? 0 : 18;
    const taxAmount = isUsd ? 0 : Number((baseAmount * 0.18).toFixed(2));
    const finalAmount = isUsd ? baseAmount : Number((baseAmount + taxAmount).toFixed(2));
    const orderId = `ai_topup_${user.id.replace(/-/g, '').slice(0, 8)}_${Date.now()}`;

    let paymentSessionId: string | undefined = undefined;

    if (this.cashfree.isConfigured) {
      try {
        const order = await this.cashfree.createOrder({
          orderId,
          amount: finalAmount,
          currency,
          customerId: user.id,
          customerName: user.profile.full_name || 'HealNari User',
          customerEmail: user.email || 'patient@healnari.app',
          customerPhone: user.profile.phone || '9999999999',
          notifyUrl: process.env.API_PUBLIC_URL
            ? `${process.env.API_PUBLIC_URL.replace(/\/$/, '')}/api/billing/webhook/cashfree`
            : undefined,
          note: `HealNari AI Tokens: ${pack.name}`,
        });
        paymentSessionId = order.payment_session_id;
      } catch (err: any) {
        throw new BadRequestException(`Gateway checkout failed: ${err?.message}`);
      }
    }

    const reportingConv = this.fxRateService.convert(finalAmount, currency, 'USD');
    const tx = {
      id: crypto.randomUUID(),
      user_id: user.id,
      plan_id: packId,
      country_code: isUsd ? 'US' : 'IN',
      original_currency: currency,
      base_amount: baseAmount,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      discount_amount: 0,
      final_amount: finalAmount,
      reporting_currency: 'USD',
      reporting_amount: reportingConv.reportingAmount,
      fx_rate_applied: reportingConv.fxRate,
      gateway: 'cashfree',
      gateway_txn_id: orderId,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    try {
      await this.supabase.admin.from('ai_transactions').insert(tx);
    } catch (err: any) {
      this.logger.warn(`Could not save token pack transaction: ${err?.message}`);
    }

    return {
      orderId,
      paymentSessionId,
      amount: finalAmount,
      currency,
      packName: pack.name,
      tokens: pack.tokens,
    };
  }

  /**
   * Retrieves all AI billing history from PostgreSQL
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
    } catch (err: any) {
      this.logger.warn(`Could not fetch ai_transactions: ${err?.message}`);
    }

    return [];
  }

  /**
   * Cancels AI subscription at period end (preserves access until current_period_end)
   */
  async cancelSubscription(user: AuthUser): Promise<AiSubscription> {
    const current = await this.getSubscription(user);
    const updated: AiSubscription = {
      ...current,
      cancel_at_period_end: true,
      status: 'active',
      updated_at: new Date().toISOString(),
    };

    try {
      await this.supabase.admin
        .from('ai_subscriptions')
        .update({ cancel_at_period_end: true, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
    } catch (err: any) {
      this.logger.warn(`Could not update cancel_at_period_end: ${err?.message}`);
    }

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

    try {
      await this.supabase.admin
        .from('ai_subscriptions')
        .update({ cancel_at_period_end: false, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
    } catch (err: any) {
      this.logger.warn(`Could not update cancel_at_period_end: ${err?.message}`);
    }

    return updated;
  }

  /**
   * Cron Job: Resets monthly credits on 1st of every month for active subscriptions.
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
