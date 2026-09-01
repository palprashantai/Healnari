import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  Query,
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
  @IsString()
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
  @IsString()
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
  @IsString()
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
  ) {}

  @Get('subscription/status')
  @ApiOperation({ summary: 'Get current user AI subscription plan, credit ledger balance, and active perks' })
  async getSubscriptionStatus(@CurrentUser() user: AuthUser) {
    const subscription = await this.subscriptionService.getSubscription(user);
    const account = await this.creditLedgerService.getAccount(user.id);
    const creditsRemaining = account.balance;

    const { countryCode, currencyCode } = this.pricingService.resolveCountryAndCurrency(user);
    const currentPriceQuote = await this.pricingService.getPricingQuote(
      subscription.plan_id,
      countryCode,
      currencyCode,
    );

    return ResponseHelper.success(
      {
        subscription,
        planConfig: currentPriceQuote,
        creditsRemaining,
        lifetimeGranted: account.lifetimeGranted,
        lifetimeConsumed: account.lifetimeConsumed,
        isPremium:
          subscription.plan_id.includes('premium') ||
          subscription.plan_id.includes('pro'),
      },
      SUCCESS_MESSAGES.DATA_RETRIEVED,
    );
  }

  @Get('pricing')
  @ApiOperation({ summary: 'Get localized multi-currency pricing quotes for all AI subscription plans' })
  async getPricing(
    @CurrentUser() user: AuthUser,
    @Query('country') country?: string,
    @Query('currency') currency?: string,
  ) {
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
      body.countryCode,
      body.currencyCode,
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
      body.countryCode,
      body.currencyCode,
      body.couponCode,
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
}
