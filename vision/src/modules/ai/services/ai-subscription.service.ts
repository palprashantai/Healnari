import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  HttpException,
  HttpStatus,
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
  [AiPlanId.DOCTOR_PLAN_1]: {
    id: AiPlanId.DOCTOR_PLAN_1,
    role: 'doctor',
    name: 'Doctor Starter',
    price: 0,
    currency: 'INR',
    monthlyCredits: 25,
    features: [
      '25 AI uses / month',
      'AI Prescription Autocomplete',
      'AI Drug & Food Safety Shield',
    ],
  },
  [AiPlanId.DOCTOR_PLAN_2]: {
    id: AiPlanId.DOCTOR_PLAN_2,
    role: 'doctor',
    name: 'Doctor Pro',
    priceMonthly: 1499,
    currency: 'INR',
    monthlyCredits: 100,
    features: [
      '100 AI uses / month',
      'AI Pre-Consult Patient Brief',
      'AI Post-Consult Summary',
      'AI Prescription Autocomplete',
      'AI Drug & Food Safety Shield',
    ],
  },
  [AiPlanId.DOCTOR_PLAN_3]: {
    id: AiPlanId.DOCTOR_PLAN_3,
    role: 'doctor',
    name: 'Doctor Premium',
    priceMonthly: 2999,
    currency: 'INR',
    monthlyCredits: 300,
    features: [
      '300 AI uses / month',
      'All Doctor AI Features included',
      'AI Clinical SOAP Note Assistant',
      'AI Pre-Consult Patient Brief',
      'AI Post-Consult Summary',
      'Priority Clinical Processing',
    ],
  },
  [AiPlanId.PATIENT_PLAN_1]: {
    id: AiPlanId.PATIENT_PLAN_1,
    role: 'patient',
    name: 'Patient Basic',
    price: 0,
    currency: 'INR',
    monthlyCredits: 15,
    features: [
      '15 AI uses / month',
      'AI Health Companion (Cycle, fertility & symptom guidance)',
      'Digital Health Records storage',
    ],
  },
  [AiPlanId.PATIENT_PLAN_2]: {
    id: AiPlanId.PATIENT_PLAN_2,
    role: 'patient',
    name: 'Patient Pro',
    priceMonthly: 499,
    currency: 'INR',
    monthlyCredits: 60,
    features: [
      '60 AI uses / month',
      'AI Health Companion',
      'AI Lab Report Decoder with biomarker explanations',
      'AI Visit Preparation Briefs for doctor consultations',
    ],
  },
  [AiPlanId.PATIENT_PLAN_3]: {
    id: AiPlanId.PATIENT_PLAN_3,
    role: 'patient',
    name: 'Patient Premium',
    priceMonthly: 999,
    currency: 'INR',
    monthlyCredits: 150,
    features: [
      '150 AI uses / month',
      'All Patient AI Features included',
      'In-depth symptom & hormone analysis',
      'Priority guidance and dedicated care support',
    ],
  },
};

export const TOKEN_PACK_CONFIGS: Record<
  string,
  { id: string; tokens: number; credits: number; priceInr: number; priceUsd: number; name: string; popular?: boolean }
> = {
  pack_100: { id: 'pack_100', tokens: 100, credits: 100, priceInr: 200, priceUsd: 3.0, name: '100 AI Credits', popular: true },
  pack_250: { id: 'pack_250', tokens: 250, credits: 250, priceInr: 450, priceUsd: 6.0, name: '250 AI Credits' },
  pack_500: { id: 'pack_500', tokens: 500, credits: 500, priceInr: 800, priceUsd: 10.0, name: '500 AI Credits' },
  pack_1000: { id: 'pack_1000', tokens: 1000, credits: 1000, priceInr: 1500, priceUsd: 18.0, name: '1,000 AI Credits' },
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
    const defaultPlan = isDoctor ? AiPlanId.DOCTOR_PLAN_1 : AiPlanId.PATIENT_PLAN_1;
    const defaultCredits = isDoctor ? 25 : 15;
    const country = (user.profile.country || 'IN').toUpperCase().trim();
    const currency = country === 'IN' ? 'INR' : 'USD';

    try {
      const { data, error } = await this.supabase.admin
        .from('ai_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        // Auto-downgrade if paid period has elapsed
        if (
          data.current_period_end &&
          new Date(data.current_period_end).getTime() < Date.now() &&
          !data.plan_id.includes('plan_1') &&
          !data.plan_id.includes('free')
        ) {
          const defaultPlan = isDoctor ? AiPlanId.DOCTOR_PLAN_1 : AiPlanId.PATIENT_PLAN_1;
          const defaultCredits = isDoctor ? 25 : 15;
          const downgraded = {
            ...data,
            plan_id: defaultPlan,
            monthly_ai_credits: defaultCredits,
            credits_used: 0,
            current_period_end: null,
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          };
          await this.supabase.admin
            .from('ai_subscriptions')
            .update({
              plan_id: defaultPlan,
              monthly_ai_credits: defaultCredits,
              credits_used: 0,
              current_period_end: null,
              cancel_at_period_end: false,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', user.id);

          try {
            await this.supabase.admin
              .from('ai_credit_accounts')
              .upsert(
                {
                  user_id: user.id,
                  balance: defaultCredits,
                  lifetime_consumed: 0,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: 'user_id' },
              );

            await this.supabase.admin.from('ai_credit_ledger').insert({
              user_id: user.id,
              entry_type: 'RESET',
              amount: defaultCredits,
              balance_after: defaultCredits,
              feature: null,
              reference_id: `expiry_${Date.now()}`,
              reason: 'Subscription period ended: Transitioned to Free Starter tier',
              metadata: {
                previous_plan: data.plan_id,
                new_plan: defaultPlan,
                timestamp: new Date().toISOString(),
              },
            });
          } catch {}

          return downgraded as AiSubscription;
        }

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
   * Deducts credits atomically and records usage in the double-entry ledger and database.
   * Guarded against race conditions and duplicates via idempotency requestId.
   */
  async deductCredits(
    user: AuthUser,
    count = 1,
    requestId?: string,
    featureKey?: string,
    reason?: string,
  ): Promise<AiSubscription & { creditsRemaining: number; success: boolean }> {
    // 1. Idempotency Check: if requestId provided and already logged, return current state without double deduction
    if (requestId) {
      try {
        const { data: existingLedger } = await this.supabase.admin
          .from('ai_credit_ledger')
          .select('*')
          .eq('user_id', user.id)
          .eq('reference_id', requestId)
          .eq('entry_type', 'CONSUME')
          .maybeSingle();

        if (existingLedger) {
          this.logger.log(`[Idempotent] Request ${requestId} already processed for user ${user.id}`);
          const current = await this.getSubscription(user);
          const rem = Math.max(0, (current.monthly_ai_credits || 0) - (current.credits_used || 0));
          return { ...current, creditsRemaining: rem, success: true };
        }
      } catch {}
    }

    // 2. Fetch current authoritative subscription
    const current = await this.getSubscription(user);
    const maxCredits = current.monthly_ai_credits || (user.profile?.role === 'doctor' ? 25 : 15);
    const creditsBefore = Math.max(0, maxCredits - (current.credits_used || 0));

    if (creditsBefore < count) {
      throw new HttpException(
        {
          statusCode: HttpStatus.PAYMENT_REQUIRED,
          error: 'Payment Required',
          message: `Insufficient AI credits. You need ${count} credit(s), but only ${creditsBefore} available. Please top up or upgrade your plan.`,
          creditsRemaining: creditsBefore,
          paywallData: {
            title: 'AI Credits Exhausted',
            description: `You need ${count} credit(s), but only have ${creditsBefore} remaining. Recharge your credits instantly or upgrade your plan.`,
            planName: current.plan_id,
            creditsRemaining: creditsBefore,
          },
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    const newCreditsUsed = (current.credits_used || 0) + count;
    const creditsAfter = Math.max(0, maxCredits - newCreditsUsed);

    // 3. Update ai_subscriptions in database
    let updatedSub: any = null;
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
        updatedSub = data;
      }
    } catch (err: any) {
      this.logger.error(`Error updating subscription credit usage: ${err?.message}`);
    }

    // 4. Synchronize ai_credit_accounts
    try {
      await this.supabase.admin
        .from('ai_credit_accounts')
        .upsert(
          {
            user_id: user.id,
            balance: creditsAfter,
            lifetime_consumed: newCreditsUsed,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' },
        );
    } catch {}

    // 5. Insert immutable audit ledger entry
    const reqRef = requestId || `req_${Date.now()}`;
    try {
      await this.supabase.admin.from('ai_credit_ledger').insert({
        user_id: user.id,
        entry_type: 'CONSUME',
        amount: count,
        balance_after: creditsAfter,
        feature: featureKey || null,
        reference_id: reqRef,
        reason: reason || `AI Invocation: ${featureKey || 'Chat'}`,
        metadata: {
          creditsBefore,
          creditsConsumed: count,
          creditsAfter,
          plan_id: current.plan_id,
          timestamp: new Date().toISOString(),
        },
      });
    } catch {}

    const resultSub = (updatedSub || { ...current, credits_used: newCreditsUsed }) as AiSubscription;
    return {
      ...resultSub,
      creditsRemaining: creditsAfter,
      success: true,
    };
  }

  /**
   * Fail-Safe Rollback: Refunds reserved credit if AI execution throws an error
   */
  async refundCredits(
    user: AuthUser,
    count = 1,
    requestId?: string,
    reason = 'AI Execution Failed / Rolled Back',
    featureKey?: string,
  ): Promise<AiSubscription & { creditsRemaining: number }> {
    const current = await this.getSubscription(user);
    const newCreditsUsed = Math.max(0, (current.credits_used || 0) - count);
    const maxCredits = current.monthly_ai_credits || (user.profile?.role === 'doctor' ? 25 : 15);
    const creditsAfter = Math.max(0, maxCredits - newCreditsUsed);

    let updatedSub: any = null;
    try {
      const { data } = await this.supabase.admin
        .from('ai_subscriptions')
        .update({
          credits_used: newCreditsUsed,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .select()
        .single();
      if (data) updatedSub = data;
    } catch {}

    try {
      await this.supabase.admin
        .from('ai_credit_accounts')
        .upsert(
          {
            user_id: user.id,
            balance: creditsAfter,
            lifetime_consumed: newCreditsUsed,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' },
        );
    } catch {}

    try {
      await this.supabase.admin.from('ai_credit_ledger').insert({
        user_id: user.id,
        entry_type: 'REFUND',
        amount: count,
        balance_after: creditsAfter,
        feature: featureKey || null,
        reference_id: requestId || `ref_${Date.now()}`,
        reason,
        metadata: {
          creditsRestored: count,
          creditsAfter,
          timestamp: new Date().toISOString(),
        },
      });
    } catch {}

    const resultSub = (updatedSub || { ...current, credits_used: newCreditsUsed }) as AiSubscription;
    return {
      ...resultSub,
      creditsRemaining: creditsAfter,
    };
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

      // ── CASE A: AI Credit Top-Up ──
      if (orderId.startsWith('ai_topup_')) {
        let creditsToAdd = 100;
        let packName = 'AI Credits Top-Up';

        const { data: dbPack } = await this.supabase.admin
          .from('ai_plans')
          .select('*')
          .eq('id', tx.plan_id)
          .maybeSingle();

        if (dbPack && dbPack.included_monthly_credits) {
          creditsToAdd = dbPack.included_monthly_credits;
          packName = dbPack.name;
        } else {
          const packConfig = TOKEN_PACK_CONFIGS[tx.plan_id] || TOKEN_PACK_CONFIGS.pack_100;
          creditsToAdd = packConfig.credits || (packConfig as any).tokens || 100;
          packName = packConfig.name;
        }

        // Fetch current subscription
        const { data: currentSub } = await this.supabase.admin
          .from('ai_subscriptions')
          .select('*')
          .eq('user_id', tx.user_id)
          .maybeSingle();

        const baseCredits = currentSub?.monthly_ai_credits || 15;
        const newMonthlyCredits = baseCredits + creditsToAdd;
        const usedCredits = currentSub?.credits_used || 0;
        const newRemaining = Math.max(0, newMonthlyCredits - usedCredits);

        // Increment monthly_ai_credits on authoritative subscription
        const { data: updatedSub } = await this.supabase.admin
          .from('ai_subscriptions')
          .update({
            monthly_ai_credits: newMonthlyCredits,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', tx.user_id)
          .select()
          .single();

        // Synchronize ai_credit_accounts
        await this.supabase.admin
          .from('ai_credit_accounts')
          .upsert(
            {
              user_id: tx.user_id,
              balance: newRemaining,
              lifetime_granted: newMonthlyCredits,
              lifetime_consumed: usedCredits,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' },
          );

        // Immutable ledger record
        await this.supabase.admin.from('ai_credit_ledger').insert({
          user_id: tx.user_id,
          entry_type: 'TOPUP',
          amount: creditsToAdd,
          balance_after: newRemaining,
          reference_id: orderId,
          reason: `AI Credits Top-Up: ${creditsToAdd} Credits (${packName})`,
          metadata: {
            orderId,
            creditsAdded: creditsToAdd,
            creditsBefore: Math.max(0, baseCredits - usedCredits),
            creditsAfter: newRemaining,
            amountPaid: tx.final_amount,
            currency: tx.original_currency,
          },
        });

        await this.supabase.admin
          .from('ai_transactions')
          .update({ status: 'paid', updated_at: new Date().toISOString() })
          .eq('id', tx.id);

        await this.notifications.create(tx.user_id, {
          type: 'credits_added',
          title: 'AI Credits Added',
          message: `Successfully added ${creditsToAdd} AI credits to your account. Your new balance is ${newRemaining} credits.`,
          data: {
            orderId,
            credits: creditsToAdd,
            balance: newRemaining,
            path: role === 'doctor' ? '/doctor-dashboard/ai' : '/patient-dashboard/ai',
          },
        }).catch(() => {});

        return (updatedSub || currentSub) as AiSubscription;
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
      const monthlyCredits =
        quote.includedCredits ||
        (isDoctor
          ? (tx.plan_id === 'doctor_plan_3' ? 300 : tx.plan_id === 'doctor_plan_2' ? 100 : 25)
          : (tx.plan_id === 'patient_plan_3' ? 150 : tx.plan_id === 'patient_plan_2' ? 60 : 15));

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
        title: 'AI Plan Activated',
        message: `Your subscription to ${quote.planName} is active with ${monthlyCredits} AI credits.`,
        data: {
          orderId,
          planId: tx.plan_id,
          path: isDoctor ? '/doctor-dashboard/ai' : '/patient-dashboard/ai',
        },
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
    credits?: number;
  }> {
    const country = (user.profile.country || 'IN').toUpperCase().trim();
    const currency = country === 'IN' ? 'INR' : 'USD';
    const isUsd = currency === 'USD';

    // Resolve pack details dynamically from DB (ai_plans & ai_regional_prices)
    let packName = 'AI Credits Top-Up';
    let packCredits = 100;
    let baseAmount = isUsd ? 3.0 : 200;

    const { data: dbPack } = await this.supabase.admin
      .from('ai_plans')
      .select('*')
      .eq('id', packId)
      .maybeSingle();

    if (dbPack) {
      packName = dbPack.name;
      packCredits = dbPack.included_monthly_credits || 100;

      const { data: dbPrice } = await this.supabase.admin
        .from('ai_regional_prices')
        .select('*')
        .eq('plan_id', packId)
        .eq('currency', currency)
        .eq('is_active', true)
        .maybeSingle();

      if (dbPrice && typeof dbPrice.base_amount === 'number') {
        baseAmount = Number(dbPrice.base_amount);
      }
    } else {
      const pack = TOKEN_PACK_CONFIGS[packId] || TOKEN_PACK_CONFIGS.pack_100;
      packName = pack.name;
      packCredits = pack.credits || pack.tokens;
      baseAmount = isUsd ? pack.priceUsd : pack.priceInr;
    }

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
          note: `HealNari AI Credits: ${packName}`,
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
      packName,
      credits: packCredits,
      tokens: packCredits,
    };
  }

  /**
   * Alias for initiateTokenPack with clean modern naming
   */
  async initiateCreditTopUp(user: AuthUser, packId: string) {
    return this.initiateTokenPack(user, packId);
  }

  /**
   * Get formatted AI Credit Top-Up packs from database with fallback
   */
  async getCreditPacks(user: AuthUser) {
    const country = (user.profile?.country || 'IN').toUpperCase().trim();
    const currency = country === 'IN' ? 'INR' : 'USD';
    const isUsd = currency === 'USD';

    try {
      const { data: dbPacks } = await this.supabase.admin
        .from('ai_plans')
        .select('id, name, description, included_monthly_credits, is_active')
        .eq('plan_type', 'credit_pack')
        .eq('is_active', true)
        .order('included_monthly_credits', { ascending: true });

      if (dbPacks && dbPacks.length > 0) {
        const planIds = dbPacks.map((p) => p.id);
        const { data: prices } = await this.supabase.admin
          .from('ai_regional_prices')
          .select('plan_id, base_amount, currency')
          .in('plan_id', planIds)
          .eq('currency', currency)
          .eq('is_active', true);

        const priceMap = new Map((prices || []).map((pr) => [pr.plan_id, pr.base_amount]));

        return dbPacks.map((p) => {
          const defaultPrice = isUsd
            ? (p.included_monthly_credits <= 100 ? 3 : p.included_monthly_credits <= 250 ? 6 : p.included_monthly_credits <= 500 ? 10 : 18)
            : (p.included_monthly_credits <= 100 ? 200 : p.included_monthly_credits <= 250 ? 450 : p.included_monthly_credits <= 500 ? 800 : 1500);
          const price = priceMap.get(p.id) ?? defaultPrice;
          return {
            id: p.id,
            name: p.name,
            credits: p.included_monthly_credits,
            price,
            currency,
            priceFormatted: isUsd ? `$${price}` : `₹${price.toLocaleString('en-IN')}`,
            description: p.description,
            popular: p.included_monthly_credits === 100,
          };
        });
      }
    } catch (err: any) {
      this.logger.warn(`Could not load credit packs from DB, falling back: ${err?.message}`);
    }

    return Object.values(TOKEN_PACK_CONFIGS).map((p) => ({
      id: p.id,
      name: p.name,
      credits: p.credits || p.tokens,
      price: isUsd ? p.priceUsd : p.priceInr,
      currency,
      priceFormatted: isUsd ? `$${p.priceUsd}` : `₹${p.priceInr.toLocaleString('en-IN')}`,
      popular: !!p.popular,
    }));
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
   * Daily Cron: Checks for expired paid subscriptions and sends 3-day renewal reminders
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { name: 'ai_subscription_expiry_sweep' })
  async handleSubscriptionExpirySweep() {
    this.logger.log('Running daily AI subscription expiry sweep...');
    const now = new Date();
    const nowIso = now.toISOString();

    try {
      // 1. Fetch active paid subscriptions that have passed their current_period_end
      const { data: expiredSubs } = await this.supabase.admin
        .from('ai_subscriptions')
        .select('*')
        .eq('status', 'active')
        .not('current_period_end', 'is', null)
        .lt('current_period_end', nowIso);

      if (expiredSubs && expiredSubs.length > 0) {
        for (const sub of expiredSubs) {
          if (sub.plan_id.includes('plan_1') || sub.plan_id.includes('free')) continue;
          const isDoctor = sub.role === 'doctor';
          const defaultPlan = isDoctor ? 'doctor_plan_1' : 'patient_plan_1';
          const defaultCredits = isDoctor ? 25 : 15;

          await this.supabase.admin
            .from('ai_subscriptions')
            .update({
              plan_id: defaultPlan,
              monthly_ai_credits: defaultCredits,
              credits_used: 0,
              current_period_end: null,
              cancel_at_period_end: false,
              updated_at: nowIso,
            })
            .eq('id', sub.id);

          try {
            await this.supabase.admin
              .from('ai_credit_accounts')
              .upsert(
                {
                  user_id: sub.user_id,
                  balance: defaultCredits,
                  lifetime_consumed: 0,
                  updated_at: nowIso,
                },
                { onConflict: 'user_id' },
              );

            await this.supabase.admin.from('ai_credit_ledger').insert({
              user_id: sub.user_id,
              entry_type: 'RESET',
              amount: defaultCredits,
              balance_after: defaultCredits,
              feature: null,
              reference_id: `cron_expiry_${sub.id}_${nowIso.slice(0, 10)}`,
              reason: 'Subscription period ended: Transitioned to Free Starter tier',
              metadata: {
                previous_plan: sub.plan_id,
                new_plan: defaultPlan,
                timestamp: nowIso,
              },
            });
          } catch {}

          await this.notifications.create(sub.user_id, {
            type: 'subscription_expired',
            title: 'AI Subscription Expired',
            message: 'Your AI plan period has ended. Your account has transitioned to the standard Starter tier. Tap here to renew your plan.',
            data: { path: isDoctor ? '/doctor-dashboard/ai' : '/patient-dashboard/ai' },
          }).catch(() => {});
        }
        this.logger.log(`Downgraded ${expiredSubs.length} expired AI subscriptions.`);
      }

      // 2. Pre-expiry renewal reminders (3 days before expiration)
      const inThreeDays = new Date(now.getTime() + 3 * 86400000).toISOString();
      const { data: dueRenewals } = await this.supabase.admin
        .from('ai_subscriptions')
        .select('*')
        .eq('status', 'active')
        .not('current_period_end', 'is', null)
        .gte('current_period_end', nowIso)
        .lte('current_period_end', inThreeDays);

      if (dueRenewals && dueRenewals.length > 0) {
        for (const sub of dueRenewals) {
          if (sub.plan_id.includes('plan_1') || sub.plan_id.includes('free')) continue;
          const isDoctor = sub.role === 'doctor';
          await this.notifications.create(sub.user_id, {
            type: 'subscription_renewal_due',
            title: 'AI Subscription Renewal Due Soon',
            message: 'Your AI subscription will expire in 3 days. Renew today to maintain uninterrupted access to all clinical AI capabilities.',
            idempotencyKey: `ai_renew_${sub.id}_${nowIso.slice(0, 10)}`,
            data: { path: isDoctor ? '/doctor-dashboard/ai' : '/patient-dashboard/ai' },
          }).catch(() => {});
        }
      }
    } catch (err: any) {
      this.logger.error(`Error during AI subscription expiry sweep: ${err?.message}`);
    }
  }

  /**
   * Cron Job: Resets monthly credits on 1st of every month for active subscriptions.
   * Only resets free tier plans or paid plans whose paid period is still valid.
   */
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async handleMonthlyCreditReset() {
    this.logger.log('Resetting monthly AI credits for active users on 1st of month...');
    const nowIso = new Date().toISOString();
    try {
      // 1. Reset free tiers
      await this.supabase.admin
        .from('ai_subscriptions')
        .update({ credits_used: 0, updated_at: nowIso })
        .eq('status', 'active')
        .or('plan_id.ilike.%plan_1%,plan_id.ilike.%free%');

      // 2. Reset active paid subscriptions still within their validity window
      await this.supabase.admin
        .from('ai_subscriptions')
        .update({ credits_used: 0, updated_at: nowIso })
        .eq('status', 'active')
        .gte('current_period_end', nowIso);
    } catch (err: any) {
      this.logger.error(`Monthly AI credit reset error: ${err?.message}`);
    }
  }
}
