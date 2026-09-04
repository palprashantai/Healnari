import {
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { AiFeatureFlagService } from '@/modules/ai/services/ai-feature-flag.service';
import { AiSubscriptionService, AI_PLANS } from '@/modules/ai/services/ai-subscription.service';
import { AiUsageService } from '@/modules/ai/services/ai-usage.service';
import { AiPricingService } from '@/modules/ai/services/ai-pricing.service';
import {
  AiFeatureKey,
  AiPlanId,
  AiEntitlementCheckResult,
} from '@/modules/ai/interfaces/ai-monetization.interface';
import type { AuthUser } from '@/core/decorators/current-user.decorator';

export class PaymentRequiredException extends HttpException {
  constructor(public readonly paywallResponse: Record<string, any>) {
    super(paywallResponse, HttpStatus.PAYMENT_REQUIRED);
  }
}

export interface AiUsageLimitInfo {
  limit: number | null;
  isUnlimited: boolean;
  used: number;
  remaining: number | null;
  unit: string;
  usageType: string;
}

@Injectable()
export class AiEntitlementService {
  private readonly logger = new Logger(AiEntitlementService.name);

  constructor(
    private readonly featureFlagService: AiFeatureFlagService,
    private readonly subscriptionService: AiSubscriptionService,
    private readonly usageService: AiUsageService,
    private readonly pricingService: AiPricingService,
  ) {}

  /**
   * Authoritative Single Source of Truth for feature usage limit resolution
   */
  async getAIUsageLimit(
    user: AuthUser,
    featureKey: string,
  ): Promise<AiUsageLimitInfo> {
    const flag = await this.featureFlagService.getFlag(featureKey);
    const subscription = await this.subscriptionService.getSubscription(user);
    const plan = await this.pricingService.getPlan(subscription.plan_id);

    const unit = flag.unit || 'uses';
    const usageType = flag.usage_type || 'credits';

    // 1. Check dynamic per-plan feature limits
    const planLimitConfig = plan.feature_limits?.[featureKey];
    const isUnlimited = planLimitConfig?.is_unlimited === true;
    let limit: number | null = null;

    if (isUnlimited) {
      limit = null;
    } else if (planLimitConfig?.limit !== undefined && planLimitConfig?.limit !== null) {
      limit = Number(planLimitConfig.limit);
    } else {
      // Legacy fallback: check feature flag free vs premium tier
      const isPremium =
        subscription.plan_id.includes('premium') || subscription.plan_id.includes('pro');
      limit = isPremium ? (flag.monthly_limit_premium ?? null) : (flag.monthly_limit_free ?? null);
    }

    const used = await this.usageService.getUserFeatureUsageCount(user.id, featureKey);
    const remaining = isUnlimited || limit === null ? null : Math.max(0, limit - used);

    return {
      limit,
      isUnlimited,
      used,
      remaining,
      unit,
      usageType,
    };
  }

  /**
   * Centralized check if user has permission and quota to use an AI feature
   */
  async canUseAIFeature(
    user: AuthUser,
    featureKey: string,
  ): Promise<AiEntitlementCheckResult> {
    const flag = await this.featureFlagService.getFlag(featureKey);
    const subscription = await this.subscriptionService.getSubscription(user);
    const plan = await this.pricingService.getPlan(subscription.plan_id);
    const userRole = user.profile.role;
    const isDoctor = userRole === 'doctor';
    const isPremium =
      (subscription.status === 'active' || subscription.status === 'trialing') &&
      (subscription.plan_id === AiPlanId.PATIENT_PREMIUM ||
        subscription.plan_id === AiPlanId.DOCTOR_PRO ||
        subscription.plan_id.includes('pro') ||
        subscription.plan_id.includes('premium'));

    // Check if subscription has expired or failed payment
    if (!['active', 'trialing', 'free'].includes(subscription.status || 'free') && flag.required_plan && !flag.required_plan.includes('plan_1')) {
      return {
        hasAccess: false,
        reason: `Your AI subscription is ${subscription.status || 'inactive'}. Please renew your subscription to access paid features.`,
        featureKey,
        featureName: flag.name,
        requiredPlan: flag.required_plan,
        userPlan: subscription.plan_id,
        creditsRemaining: 0,
        monthlyLimit: 0,
        isRateLimited: false,
      };
    }

    // 1. Feature flag status check
    if (!flag.is_enabled || flag.status === 'archived') {
      return {
        hasAccess: false,
        reason: `${flag.name} is currently temporarily unavailable for scheduled maintenance.`,
        featureKey,
        featureName: flag.name,
        requiredPlan: flag.required_plan,
        userPlan: subscription.plan_id,
        creditsRemaining: Math.max(
          0,
          (subscription.monthly_ai_credits || 0) - (subscription.credits_used || 0),
        ),
        monthlyLimit: null,
        isRateLimited: false,
      };
    }

    // 2. Role applicability check
    if (flag.applicable_roles?.length && !flag.applicable_roles.includes(userRole)) {
      return {
        hasAccess: false,
        reason: `This AI capability is exclusive to ${flag.applicable_roles.join(', ')} accounts.`,
        featureKey,
        featureName: flag.name,
        requiredPlan: flag.required_plan,
        userPlan: subscription.plan_id,
        creditsRemaining: 0,
        monthlyLimit: null,
        isRateLimited: false,
      };
    }

    // Construct dynamic paywall context tailored to current plan and role
    let upgradePlanId = isDoctor ? 'doctor_plan_2' : 'patient_plan_2';
    if (isDoctor) {
      if (featureKey === AiFeatureKey.DOCTOR_SOAP_NOTES || subscription.plan_id === 'doctor_plan_2') {
        upgradePlanId = 'doctor_plan_3';
      } else {
        upgradePlanId = 'doctor_plan_2';
      }
    } else {
      if (subscription.plan_id === 'patient_plan_2') {
        upgradePlanId = 'patient_plan_3';
      } else {
        upgradePlanId = 'patient_plan_2';
      }
    }

    const upgradePlan = await this.pricingService.getPlan(upgradePlanId).catch(() => null);
    const userCurrency = (user.profile?.currency || 'INR').toUpperCase() === 'USD' ? 'USD' : 'INR';
    const isUsd = userCurrency === 'USD';
    const priceAmount = isDoctor
      ? (upgradePlanId === 'doctor_plan_3' ? (isUsd ? 39 : 2999) : (isUsd ? 19 : 1499))
      : (upgradePlanId === 'patient_plan_3' ? (isUsd ? 14 : 999) : (isUsd ? 7 : 499));
    const priceText = isUsd ? `$${priceAmount} / month` : `₹${priceAmount.toLocaleString('en-IN')} / month`;

    const paywallData = {
      title: `Unlock ${flag.name} with ${upgradePlan?.name || (isDoctor ? 'Doctor Pro' : 'Patient Pro')}`,
      description: flag.description,
      planName: upgradePlan?.name || (isDoctor ? 'Doctor Pro' : 'Patient Pro'),
      planId: upgradePlanId,
      price: priceText,
      priceAmount,
      billingCycle: 'monthly',
      currency: userCurrency,
      features: upgradePlan?.features || [],
      upgradeUrl: '/api/ai/subscription/upgrade',
    };

    // 3. Plan feature inclusion check
    // If the plan has an explicit feature list, verify inclusion
    const planFeatures = plan.features || [];
    const isFeatureInPlan = planFeatures.length === 0 || planFeatures.includes(featureKey);

    if (!isFeatureInPlan) {
      return {
        hasAccess: false,
        reason: `${flag.name} is not included in your current plan (${plan.name}). Upgrade to access this feature.`,
        featureKey,
        featureName: flag.name,
        requiredPlan: flag.required_plan || upgradePlanId,
        userPlan: subscription.plan_id,
        creditsRemaining: 0,
        monthlyLimit: 0,
        isRateLimited: false,
        paywallData,
      };
    }

    // 4. Usage limit check
    const limitInfo = await this.getAIUsageLimit(user, featureKey);

    if (!limitInfo.isUnlimited && limitInfo.limit !== null) {
      if (limitInfo.limit === 0) {
        return {
          hasAccess: false,
          reason: `${flag.name} is available exclusively on higher tiers.`,
          featureKey,
          featureName: flag.name,
          requiredPlan: flag.required_plan || upgradePlanId,
          userPlan: subscription.plan_id,
          creditsRemaining: 0,
          monthlyLimit: 0,
          isRateLimited: false,
          isUnlimited: false,
          unit: limitInfo.unit,
          usageType: limitInfo.usageType,
          used: limitInfo.used,
          paywallData,
        };
      }

      if (limitInfo.used >= limitInfo.limit) {
        return {
          hasAccess: false,
          reason: `You have reached your monthly allowance of ${limitInfo.limit} ${limitInfo.unit} for ${flag.name}.`,
          featureKey,
          featureName: flag.name,
          requiredPlan: upgradePlanId,
          userPlan: subscription.plan_id,
          creditsRemaining: 0,
          monthlyLimit: limitInfo.limit,
          isRateLimited: true,
          isUnlimited: false,
          unit: limitInfo.unit,
          usageType: limitInfo.usageType,
          used: limitInfo.used,
          paywallData: {
            ...paywallData,
            title: `Monthly Limit Reached for ${flag.name}`,
            description: `You have used ${limitInfo.used} of ${limitInfo.limit} ${limitInfo.unit} included in your plan this month. Upgrade to continue with unlimited usage.`,
          },
        };
      }
    }

    // 5. Total credit balance check (for credit-based operations)
    const creditsUsed = subscription.credits_used || 0;
    const monthlyCredits =
      subscription.monthly_ai_credits || (plan.included_monthly_credits || (isPremium ? 500 : 10));
    const creditsRemaining = Math.max(0, monthlyCredits - creditsUsed);

    // If the feature is not unlimited and credit consumption is required, verify credit balance
    if (!limitInfo.isUnlimited && creditsRemaining <= 0 && flag.credit_cost > 0) {
      return {
        hasAccess: false,
        reason: 'You have exhausted your monthly AI credits. Your credits will reset at the start of next month.',
        featureKey,
        featureName: flag.name,
        requiredPlan: isPremium ? null : upgradePlanId,
        userPlan: subscription.plan_id,
        creditsRemaining: 0,
        monthlyLimit: monthlyCredits,
        isRateLimited: true,
        paywallData,
      };
    }

    return {
      hasAccess: true,
      featureKey,
      featureName: flag.name,
      requiredPlan: flag.required_plan,
      userPlan: subscription.plan_id,
      creditsRemaining,
      monthlyLimit: limitInfo.limit,
      isRateLimited: false,
      isUnlimited: limitInfo.isUnlimited,
      unit: limitInfo.unit,
      usageType: limitInfo.usageType,
      used: limitInfo.used,
    };
  }

  /**
   * Alias for canUseAIFeature to preserve backwards compatibility
   */
  async checkAccess(
    user: AuthUser,
    featureKey: string,
  ): Promise<AiEntitlementCheckResult> {
    return this.canUseAIFeature(user, featureKey);
  }

  /**
   * Enforces access check. Throws HTTP 402 PaymentRequiredException if denied.
   */
  async enforceAccess(user: AuthUser, featureKey: string): Promise<AiEntitlementCheckResult> {
    const result = await this.canUseAIFeature(user, featureKey);
    if (!result.hasAccess) {
      this.logger.warn(`AI Access Denied for user ${user.id} on feature ${featureKey}: ${result.reason}`);
      throw new PaymentRequiredException({
        statusCode: HttpStatus.PAYMENT_REQUIRED,
        error: 'Payment Required',
        message: result.reason,
        feature: featureKey,
        featureName: result.featureName,
        requiredPlan: result.requiredPlan,
        userPlan: result.userPlan,
        creditsRemaining: result.creditsRemaining,
        paywallData: result.paywallData,
      });
    }
    return result;
  }

  /**
   * Returns complete entitlement matrix for user's dashboard
   */
  async getUserEntitlements(user: AuthUser) {
    const flags = await this.featureFlagService.getAllFlags();
    const subscription = await this.subscriptionService.getSubscription(user);

    const featureChecks = await Promise.all(
      flags.map((flag) => this.canUseAIFeature(user, flag.feature_key)),
    );

    const features: Record<string, AiEntitlementCheckResult> = {};
    for (const check of featureChecks) {
      features[check.featureKey] = check;
    }

    return {
      subscription,
      creditsRemaining: Math.max(
        0,
        (subscription.monthly_ai_credits || 10) - (subscription.credits_used || 0),
      ),
      features,
    };
  }
}
