import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  Query,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn } from 'class-validator';
import { SupabaseAuthGuard } from '@/core/guards/supabase-auth.guard';
import { CurrentUser } from '@/core/decorators/current-user.decorator';
import type { AuthUser } from '@/core/decorators/current-user.decorator';
import { AiSubscriptionService } from '@/modules/ai/services/ai-subscription.service';
import { AiEntitlementService } from '@/modules/ai/services/ai-entitlement.service';
import { AiAnalyticsService } from '@/modules/ai/services/ai-analytics.service';
import { AiPricingService } from '@/modules/ai/services/ai-pricing.service';
import { AiCreditLedgerService } from '@/modules/ai/services/ai-credit-ledger.service';
import { AiUsageService } from '@/modules/ai/services/ai-usage.service';
import { AiFeatureFlagService } from '@/modules/ai/services/ai-feature-flag.service';
import { ResponseHelper } from '@/core/helpers/response.helper';
import { SUCCESS_MESSAGES } from '@/core/constants/messages.constant';

export class UpgradeSubscriptionDto {
  @IsString()
  planId: string;

  @IsOptional()
  @IsIn(['monthly', 'yearly'])
  billingCycle?: 'monthly' | 'yearly';

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsOptional()
  @IsString()
  countryCode?: string;

  @IsOptional()
  @IsIn(['INR', 'USD'])
  currencyCode?: string;
}

export class ActivateSubscriptionDto {
  @IsString()
  planId: string;

  @IsOptional()
  @IsIn(['monthly', 'yearly'])
  billingCycle?: 'monthly' | 'yearly';

  @IsOptional()
  @IsString()
  paymentReference?: string;

  @IsOptional()
  @IsString()
  countryCode?: string;

  @IsOptional()
  @IsIn(['INR', 'USD'])
  currencyCode?: string;

  @IsOptional()
  @IsString()
  couponCode?: string;
}

export class ValidateCouponDto {
  @IsString()
  code: string;

  @IsString()
  planId: string;

  @IsOptional()
  @IsString()
  countryCode?: string;

  @IsOptional()
  @IsIn(['INR', 'USD'])
  currencyCode?: string;
}

export class TrackEventDto {
  @IsString()
  eventType: string;

  @IsOptional()
  @IsString()
  feature?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class BuyCreditsDto {
  @IsString()
  packId: string;

  @IsOptional()
  @IsString()
  paymentReference?: string;

  @IsOptional()
  @IsIn(['INR', 'USD'])
  currency?: string;
}

@ApiTags('AI Subscriptions & Entitlements')
@Controller('api/ai')
@UseGuards(SupabaseAuthGuard)
export class AiSubscriptionController {
  constructor(
    private readonly subscriptionService: AiSubscriptionService,
    private readonly entitlementService: AiEntitlementService,
    private readonly analyticsService: AiAnalyticsService,
    private readonly pricingService: AiPricingService,
    private readonly creditLedgerService: AiCreditLedgerService,
    private readonly usageService: AiUsageService,
    private readonly featureFlagService: AiFeatureFlagService,
  ) {}

  @Get('subscription/status')
  @ApiOperation({ summary: 'Get current user AI subscription plan, credit ledger balance, and active perks' })
  async getSubscriptionStatus(@CurrentUser() user: AuthUser) {
    const subscription = await this.subscriptionService.getSubscription(user);
    const totalCredits = subscription.monthly_ai_credits || (user.profile?.role === 'doctor' ? 25 : 15);
    const creditsUsed = subscription.credits_used || 0;
    const creditsRemaining = Math.max(0, totalCredits - creditsUsed);

    const { countryCode, currencyCode } = this.pricingService.resolveCountryAndCurrency(user);
    const currentPriceQuote = await this.pricingService.getPricingQuote(
      subscription.plan_id,
      countryCode,
      currencyCode,
    );

    return ResponseHelper.success(
      {
        subscription: {
          ...subscription,
          plan_name: currentPriceQuote?.planName || subscription.plan_id,
        },
        planConfig: currentPriceQuote,
        creditsRemaining,
        totalCredits,
        creditsUsed,
        lifetimeGranted: totalCredits,
        lifetimeConsumed: creditsUsed,
        isPremium:
          subscription.plan_id.includes('premium') ||
          subscription.plan_id.includes('pro'),
      },
      SUCCESS_MESSAGES.DATA_RETRIEVED,
    );
  }

  @Get('pricing')
  @ApiOperation({ summary: 'Get market pricing quotes for all active AI tiers' })
  async getPricing(
    @CurrentUser() user: AuthUser,
    @Query('country') country?: string,
    @Query('currency') currency?: string,
  ) {
    if (currency) {
      const code = currency.toUpperCase().trim();
      if (code !== 'INR' && code !== 'USD') {
        throw new BadRequestException(
          `Unsupported currency "${currency}". HealNari strictly supports only INR and USD.`,
        );
      }
    }
    const { countryCode, currencyCode } = this.pricingService.resolveCountryAndCurrency(
      user,
      country,
      currency,
    );
    const quotes = await this.pricingService.getAllPlansForMarket(
      countryCode,
      currencyCode,
      user.profile.role as any,
    );
    return ResponseHelper.success(quotes, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @Post('coupons/validate')
  @ApiOperation({ summary: 'Validate discount coupon for country and plan' })
  async validateCoupon(
    @CurrentUser() user: AuthUser,
    @Body() body: ValidateCouponDto,
  ) {
    const { countryCode, currencyCode } = this.pricingService.resolveCountryAndCurrency(
      user,
      body.countryCode,
      body.currencyCode,
    );
    const coupon = await this.pricingService.validateCoupon(
      body.code,
      body.planId,
      countryCode,
      currencyCode,
    );

    if (!coupon) {
      return ResponseHelper.error('Invalid or expired coupon code.');
    }

    const discountedQuote = await this.pricingService.getPricingQuote(
      body.planId,
      countryCode,
      currencyCode,
      body.code,
    );

    return ResponseHelper.success(
      {
        coupon,
        discountedQuote,
      },
      'Coupon applied successfully.',
    );
  }

  @Get('entitlements')
  @ApiOperation({ summary: 'Get user AI feature access matrix and limits' })
  async getEntitlements(@CurrentUser() user: AuthUser) {
    const entitlements = await this.entitlementService.getUserEntitlements(user);
    return ResponseHelper.success(entitlements, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @Get('credit-ledger')
  @ApiOperation({ summary: 'Get user auditable double-entry AI credit ledger history' })
  async getCreditLedger(
    @CurrentUser() user: AuthUser,
    @Query('limit') limit?: string,
  ) {
    const history = await this.creditLedgerService.getLedgerHistory(
      user.id,
      Number(limit || 50),
    );
    return ResponseHelper.success(history, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @Post('subscription/upgrade')
  @ApiOperation({ summary: 'Initiate payment order for AI Premium plan in local currency' })
  async initiateUpgrade(
    @CurrentUser() user: AuthUser,
    @Body() body: UpgradeSubscriptionDto,
  ) {
    const order = await this.subscriptionService.initiateUpgrade(
      user,
      body.planId,
      body.billingCycle || 'monthly',
      body.couponCode,
    );

    await this.analyticsService.track({
      event_type: 'AI_UPGRADE_STARTED',
      user_id: user.id,
      role: user.profile.role,
      feature: body.planId,
      metadata: {
        planId: body.planId,
        billingCycle: body.billingCycle,
        currency: order.currency,
        amount: order.finalAmount,
      },
    });

    return ResponseHelper.success(order, 'AI Upgrade checkout order initiated.');
  }

  @Get('subscription/verify/:orderId')
  @ApiOperation({ summary: 'Verify Cashfree payment and reconcile AI subscription status' })
  async verifyOrder(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
  ) {
    const subscription = await this.subscriptionService.reconcileSubscriptionOrder(orderId);
    return ResponseHelper.success(
      subscription,
      'Subscription verified and reconciled successfully.',
    );
  }

  @Get('credits/packs')
  @ApiOperation({ summary: 'Get available AI credit top-up packs with localized pricing' })
  async getCreditPacks(@CurrentUser() user: AuthUser) {
    const packs = await this.subscriptionService.getCreditPacks(user);
    return ResponseHelper.success(packs, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @Post('credits/topup')
  @ApiOperation({ summary: 'Initiate payment order for instant AI credit top-up pack' })
  async initiateTopUp(
    @CurrentUser() user: AuthUser,
    @Body() body: BuyCreditsDto,
  ) {
    const order = await this.subscriptionService.initiateCreditTopUp(user, body.packId);
    return ResponseHelper.success(order, 'Credit top-up checkout initiated.');
  }

  @Post('credits/topup/activate')
  @ApiOperation({ summary: 'Activate AI credit top-up upon successful payment' })
  async activateTopUp(
    @CurrentUser() user: AuthUser,
    @Body() body: { orderId: string },
  ) {
    const sub = await this.subscriptionService.reconcileSubscriptionOrder(body.orderId);
    return ResponseHelper.success(sub, 'AI credits successfully added to your balance.');
  }

  @Post('subscription/activate')
  @ApiOperation({ summary: 'Activate AI subscription upon verified payment' })
  async activateSubscription(
    @CurrentUser() user: AuthUser,
    @Body() body: ActivateSubscriptionDto,
  ) {
    const subscription = await this.subscriptionService.activateSubscription(
      user,
      body.planId,
      body.billingCycle || 'monthly',
      body.paymentReference,
    );

    await this.analyticsService.track({
      event_type: 'AI_UPGRADE_COMPLETED',
      user_id: user.id,
      role: user.profile.role,
      feature: body.planId,
      metadata: {
        planId: body.planId,
        billingCycle: body.billingCycle,
        paymentReference: body.paymentReference,
      },
    });

    return ResponseHelper.success(
      subscription,
      'Your HealNari AI subscription has been activated successfully.',
    );
  }

  @Post('analytics/track')
  @ApiOperation({ summary: 'Track front-end AI funnel and paywall events' })
  async trackAnalytics(
    @CurrentUser() user: AuthUser,
    @Body() body: TrackEventDto,
  ) {
    await this.analyticsService.track({
      event_type: body.eventType,
      user_id: user.id,
      role: user.profile.role,
      feature: body.feature,
      metadata: body.metadata,
    });
    return ResponseHelper.success(null, 'Event tracked.');
  }

  @Get('billing-history')
  @ApiOperation({ summary: 'Get user AI subscription invoices and transaction history' })
  async getBillingHistory(@CurrentUser() user: AuthUser) {
    const history = await this.subscriptionService.getBillingHistory(user.id);
    return ResponseHelper.success(history, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @Get('usage-history')
  @ApiOperation({ summary: 'Get user granular AI query usage history filtered by timeframe' })
  async getUsageHistory(
    @CurrentUser() user: AuthUser,
    @Query('timeframe') timeframe?: 'today' | 'week' | 'month' | 'all',
    @Query('limit') limit?: string,
  ) {
    const logs = await this.usageService.getUserUsageLogs(
      user.id,
      timeframe || 'month',
      Number(limit || 50),
    );
    return ResponseHelper.success(logs, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @Post('subscription/cancel')
  @ApiOperation({ summary: 'Cancel AI subscription at end of current billing period' })
  async cancelSubscription(@CurrentUser() user: AuthUser) {
    const subscription = await this.subscriptionService.cancelSubscription(user);
    await this.analyticsService.track({
      event_type: 'AI_SUBSCRIPTION_CANCELLED',
      user_id: user.id,
      role: user.profile.role,
    });
    return ResponseHelper.success(
      subscription,
      'Your subscription will expire at the end of your current 30-day period.',
    );
  }

  @Post('subscription/resume')
  @ApiOperation({ summary: 'Resume previously cancelled AI subscription' })
  async resumeSubscription(@CurrentUser() user: AuthUser) {
    const subscription = await this.subscriptionService.resumeSubscription(user);
    await this.analyticsService.track({
      event_type: 'AI_SUBSCRIPTION_RESUMED',
      user_id: user.id,
      role: user.profile.role,
    });
    return ResponseHelper.success(
      subscription,
      'Your subscription has been resumed successfully.',
    );
  }

  @Post('credits/order')
  @ApiOperation({ summary: 'Initiate checkout order for one-off AI token top-up pack' })
  async orderCredits(
    @CurrentUser() user: AuthUser,
    @Body() body: BuyCreditsDto,
  ) {
    const order = await this.subscriptionService.initiateTokenPack(user, body.packId);
    return ResponseHelper.success(order, 'Token pack checkout order initiated.');
  }

  @Post('credits/buy')
  @ApiOperation({ summary: 'Purchase or verify one-off AI token top-up pack' })
  async buyCredits(
    @CurrentUser() user: AuthUser,
    @Body() body: BuyCreditsDto,
  ) {
    if (body.paymentReference) {
      const sub = await this.subscriptionService.reconcileSubscriptionOrder(body.paymentReference);
      return ResponseHelper.success(sub, 'Token pack purchase verified.');
    }
    const order = await this.subscriptionService.initiateTokenPack(user, body.packId);
    return ResponseHelper.success(order, 'Token pack checkout order initiated.');
  }

  @Get('features/catalog')
  @ApiOperation({ summary: 'Get user role-tailored AI feature catalog with token costs and launch routes' })
  async getFeaturesCatalog(@CurrentUser() user: AuthUser) {
    const role = user.profile?.role || 'patient';
    const isDoctor = role === 'doctor';

    // 1. Fetch user's active subscription and plan from DB
    const sub = await this.subscriptionService.getSubscription(user);
    const plan = await this.pricingService.getPlan(sub.plan_id).catch(() => null);
    const includedFeatures = plan?.features || [];

    // 2. Fetch all feature flags from DB
    const allFlags = await this.featureFlagService.getAllFlags();

    // 3. Filter for applicable role
    const roleFlags = allFlags.filter((f) => {
      if (!f.is_enabled) return false;
      if (f.status === 'archived') return false;
      const roles = Array.isArray(f.applicable_roles) ? f.applicable_roles : ['patient', 'doctor'];
      return roles.includes(role);
    });

    // Presentation UI metadata mapping for icons, category and destination routes
    const uiMeta: Record<string, { icon: string; accent: string; route: string; actionLabel: string; category: string; tagline?: string }> = {
      DOCTOR_SOAP_NOTES: {
        icon: 'fa-file-medical',
        accent: '#6B46C1',
        route: '/doctor-dashboard/telemedicine',
        actionLabel: 'Use in Telemed →',
        category: 'Clinical EMR',
        tagline: 'Draft comprehensive clinical notes from consultation notes in seconds',
      },
      DOCTOR_RX_AUTOCOMPLETE: {
        icon: 'fa-prescription-bottle-medical',
        accent: '#10b981',
        route: '/doctor-dashboard/prescriptions',
        actionLabel: 'Open Prescriptions →',
        category: 'Prescriptions',
        tagline: 'Instant dosage, frequency, and duration intelligence',
      },
      DOCTOR_CONSULT_SUMMARY: {
        icon: 'fa-file-lines',
        accent: '#0ea5e9',
        route: '/doctor-dashboard/telemedicine',
        actionLabel: 'Use in Telemed →',
        category: 'Patient Care',
        tagline: 'Generate patient-friendly takeaway briefs & follow-up milestones',
      },
      DOCTOR_DRUG_SAFETY: {
        icon: 'fa-shield-halved',
        accent: '#f43f5e',
        route: '/doctor-dashboard/prescriptions',
        actionLabel: 'Check Interactions →',
        category: 'Safety',
        tagline: 'Cross-check multiple prescriptions for contraindications',
      },
      DOCTOR_PATIENT_BRIEF: {
        icon: 'fa-clipboard-user',
        accent: '#f59e0b',
        route: '/doctor-dashboard/reports',
        actionLabel: 'View Reports →',
        category: 'Preparation',
        tagline: 'AI summary of patient medical history before your call begins',
      },
      DOCTOR_CHAT: {
        icon: 'fa-comments',
        accent: '#8b5cf6',
        route: '#chat',
        actionLabel: 'Open Assistant →',
        category: 'Assistant',
        tagline: 'Interactive assistant for dosage formulas and clinical protocols',
      },
      PATIENT_LAB_ANALYSIS: {
        icon: 'fa-flask-vial',
        accent: '#6B46C1',
        route: '/patient-dashboard/records',
        actionLabel: 'Upload Report →',
        category: 'Diagnostics',
        tagline: 'Translate blood work & pathology reports into plain English',
      },
      PATIENT_CONSULT_PREP: {
        icon: 'fa-calendar-plus',
        accent: '#10b981',
        route: '/patient-dashboard/appointments',
        actionLabel: 'Prepare Visit →',
        category: 'Care Prep',
        tagline: 'Personalized questions & symptom timeline to ask your doctor',
      },
      PATIENT_CHAT: {
        icon: 'fa-heart-pulse',
        accent: '#e11d48',
        route: '#chat',
        actionLabel: 'Talk to Companion →',
        category: 'Wellness',
        tagline: 'Private, compassionate answers for women’s wellness & health',
      },
    };

    const result = roleFlags.map((f) => {
      const isIncluded = includedFeatures.includes(f.feature_key);
      const meta = uiMeta[f.feature_key] || {
        icon: 'fa-wand-magic-sparkles',
        accent: '#8b5cf6',
        route: '#chat',
        actionLabel: 'Launch Feature →',
        category: isDoctor ? 'Clinical Tool' : 'Health Tool',
      };

      return {
        id: f.feature_key,
        name: f.name,
        tagline: meta.tagline || f.description,
        description: f.description,
        tokenCost: f.credit_cost || 1,
        isIncluded,
        badge: isIncluded ? 'Included' : 'Upgrade Required',
        category: meta.category,
        icon: meta.icon,
        accent: meta.accent,
        route: meta.route,
        actionLabel: meta.actionLabel,
      };
    });

    return ResponseHelper.success(result, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }
}
