import {
  Injectable,
  HttpException,
  HttpStatus,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { AiFeatureFlagService } from '@/modules/ai/services/ai-feature-flag.service';
import { AiSubscriptionService, AI_PLANS } from '@/modules/ai/services/ai-subscription.service';
import { AiUsageService } from '@/modules/ai/services/ai-usage.service';
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

@Injectable()
export class AiEntitlementService {
  private readonly logger = new Logger(AiEntitlementService.name);

  constructor(
    private readonly featureFlagService: AiFeatureFlagService,
    private readonly subscriptionService: AiSubscriptionService,
    private readonly usageService: AiUsageService,
  ) {}

  /**
   * Checks if user has permission to use a specific AI capability.
   */
  async checkAccess(
    user: AuthUser,
    featureKey: string,
  ): Promise<AiEntitlementCheckResult> {
    const flag = await this.featureFlagService.getFlag(featureKey);
    const subscription = await this.subscriptionService.getSubscription(user);
    const userRole = user.profile.role;
    const isDoctor = userRole === 'doctor';
    const isPremium =
      subscription.plan_id === AiPlanId.PATIENT_PREMIUM ||
      subscription.plan_id === AiPlanId.DOCTOR_PRO ||
      subscription.plan_id.includes('pro') ||
      subscription.plan_id.includes('premium');

    // 1. Feature flag global enable/disable
    if (!flag.is_enabled) {
      return {
        hasAccess: false,
        reason: `${flag.name} is currently temporarily unavailable for scheduled maintenance.`,
        featureKey,
        featureName: flag.name,
        requiredPlan: flag.required_plan,
        userPlan: subscription.plan_id,
        creditsRemaining: Math.max(0, (subscription.monthly_ai_credits || 0) - (subscription.credits_used || 0)),
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

    const upgradePlanId = isDoctor ? AiPlanId.DOCTOR_PRO : AiPlanId.PATIENT_PREMIUM;
    const planConfig = AI_PLANS[upgradePlanId];
    const priceText = isDoctor ? '₹999 / month' : '₹299 / month';
    const priceAmount = isDoctor ? 999 : 299;

    const paywallData = {
      title: isDoctor
        ? `Unlock ${flag.name} with Doctor AI Pro`
        : `Unlock ${flag.name} with HealNari AI Premium`,
      description: flag.description,
      planName: isDoctor ? 'Doctor AI Pro' : 'HealNari AI Premium',
      price: priceText,
      priceAmount,
      billingCycle: 'monthly',
      currency: 'INR',
      features: planConfig?.features || [],
      upgradeUrl: '/api/ai/subscription/upgrade',
    };

    // 3. Plan requirement check
    if (flag.required_plan && !isPremium) {
      return {
        hasAccess: false,
        reason: `${flag.name} is a premium feature requiring ${paywallData.planName}.`,
        featureKey,
        featureName: flag.name,
        requiredPlan: flag.required_plan,
        userPlan: subscription.plan_id,
        creditsRemaining: 0,
        monthlyLimit: 0,
        isRateLimited: false,
        paywallData,
      };
    }

    // 4. Usage limit check for free tier
    if (!isPremium && flag.monthly_limit_free !== null && flag.monthly_limit_free !== undefined) {
      if (flag.monthly_limit_free === 0) {
        return {
          hasAccess: false,
          reason: `${flag.name} is available exclusively on ${paywallData.planName}.`,
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

      const usedThisMonth = await this.usageService.getUserFeatureUsageCount(user.id, featureKey);
      if (usedThisMonth >= flag.monthly_limit_free) {
        return {
          hasAccess: false,
          reason: `You have reached your free allowance of ${flag.monthly_limit_free} uses for ${flag.name} this month.`,
          featureKey,
          featureName: flag.name,
          requiredPlan: upgradePlanId,
          userPlan: subscription.plan_id,
          creditsRemaining: 0,
          monthlyLimit: flag.monthly_limit_free,
          isRateLimited: true,
          paywallData: {
            ...paywallData,
            title: `Monthly Allowance Reached for ${flag.name}`,
            description: `You have used your ${flag.monthly_limit_free} free queries this month. Upgrade to continue with unlimited queries.`,
          },
        };
      }
    }

    // 5. Total credit balance check
    const creditsUsed = subscription.credits_used || 0;
    const monthlyCredits = subscription.monthly_ai_credits || (isPremium ? 200 : 5);
    const creditsRemaining = Math.max(0, monthlyCredits - creditsUsed);

    if (creditsRemaining <= 0) {
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
      monthlyLimit: isPremium ? flag.monthly_limit_premium : flag.monthly_limit_free,
      isRateLimited: false,
    };
  }

  /**
   * Enforces access check. Throws HTTP 402 PaymentRequiredException if denied.
   */
  async enforceAccess(user: AuthUser, featureKey: string): Promise<AiEntitlementCheckResult> {
    const result = await this.checkAccess(user, featureKey);
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
      flags.map((flag) => this.checkAccess(user, flag.feature_key)),
    );

    const features: Record<string, AiEntitlementCheckResult> = {};
    for (const check of featureChecks) {
      features[check.featureKey] = check;
    }

    return {
      subscription,
      creditsRemaining: Math.max(0, (subscription.monthly_ai_credits || 5) - (subscription.credits_used || 0)),
      features,
    };
  }
}
