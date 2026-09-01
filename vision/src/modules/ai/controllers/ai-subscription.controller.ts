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
import { AiSubscriptionService, AI_PLANS } from '@/modules/ai/services/ai-subscription.service';
import { AiEntitlementService } from '@/modules/ai/services/ai-entitlement.service';
import { AiAnalyticsService } from '@/modules/ai/services/ai-analytics.service';
import { ResponseHelper } from '@/core/helpers/response.helper';
import { SUCCESS_MESSAGES } from '@/core/constants/messages.constant';

export class UpgradeSubscriptionDto {
  @IsString()
  planId: string;

  @IsOptional()
  @IsIn(['monthly', 'yearly'])
  billingCycle?: 'monthly' | 'yearly';
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
  ) {}

  @Get('subscription/status')
  @ApiOperation({ summary: 'Get current user AI subscription plan and credits' })
  async getSubscriptionStatus(@CurrentUser() user: AuthUser) {
    const subscription = await this.subscriptionService.getSubscription(user);
    const planConfig = (AI_PLANS as any)[subscription.plan_id] || (AI_PLANS as any)['patient_free'];
    const creditsRemaining = Math.max(
      0,
      (subscription.monthly_ai_credits || 5) - (subscription.credits_used || 0),
    );

    return ResponseHelper.success(
      {
        subscription,
        planConfig,
        creditsRemaining,
        isPremium:
          subscription.plan_id.includes('premium') ||
          subscription.plan_id.includes('pro'),
      },
      SUCCESS_MESSAGES.DATA_RETRIEVED,
    );
  }

  @Get('subscription/plans')
  @ApiOperation({ summary: 'List all available AI subscription tiers' })
  async getPlans() {
    return ResponseHelper.success(AI_PLANS, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @Get('entitlements')
  @ApiOperation({ summary: 'Get user AI feature access matrix and limits' })
  async getEntitlements(@CurrentUser() user: AuthUser) {
    const entitlements = await this.entitlementService.getUserEntitlements(user);
    return ResponseHelper.success(entitlements, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @Post('subscription/upgrade')
  @ApiOperation({ summary: 'Initiate Cashfree payment order for AI subscription upgrade' })
  async initiateUpgrade(
    @CurrentUser() user: AuthUser,
    @Body() body: UpgradeSubscriptionDto,
  ) {
    await this.analyticsService.track({
      event_type: 'AI_UPGRADE_STARTED',
      user_id: user.id,
      role: user.profile.role,
      metadata: { targetPlanId: body.planId, billingCycle: body.billingCycle },
    });

    const result = await this.subscriptionService.initiateUpgrade(
      user,
      body.planId,
      body.billingCycle || 'monthly',
    );

    return ResponseHelper.success(result, 'Upgrade order initiated.');
  }

  @Post('subscription/activate')
  @ApiOperation({ summary: 'Activate AI subscription upon payment confirmation' })
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
      metadata: { planId: body.planId, billingCycle: body.billingCycle },
    });

    return ResponseHelper.success(subscription, 'AI Subscription activated successfully.');
  }

  @Post('analytics/event')
  @ApiOperation({ summary: 'Track client-side AI product funnel event' })
  async trackClientEvent(
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
    return ResponseHelper.success({ tracked: true }, 'Event recorded.');
  }
}
