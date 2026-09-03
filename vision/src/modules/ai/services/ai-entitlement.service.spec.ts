import { Test, TestingModule } from '@nestjs/testing';
import {
  AiEntitlementService,
  PaymentRequiredException,
} from './ai-entitlement.service';
import { AiFeatureFlagService } from './ai-feature-flag.service';
import { AiSubscriptionService } from './ai-subscription.service';
import { AiUsageService } from './ai-usage.service';
import { AiPricingService } from './ai-pricing.service';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { FXRateService } from '@/core/fx/fx-rate.service';
import { CashfreeService } from '@/core/cashfree/cashfree.service';
import { NotificationsService } from '@/modules/notifications/services/notifications.service';
import { AiCreditLedgerService } from './ai-credit-ledger.service';
import { createSupabaseMock } from '@/test-utils/supabase-mock';
import { ProfileRole } from '@/shared/interfaces/profile.interface';
import { AiFeatureKey } from '../interfaces/ai-monetization.interface';
import type { AuthUser } from '@/core/decorators/current-user.decorator';

describe('AiEntitlementService — Centralized AI Product Control & Limit Enforcement', () => {
  let service: AiEntitlementService;
  let featureFlagService: AiFeatureFlagService;
  let usageService: AiUsageService;
  let pricingService: AiPricingService;
  let subscriptionService: AiSubscriptionService;

  const mockPatientUser: AuthUser = {
    id: 'usr-patient-123',
    email: 'patient@example.com',
    profile: {
      id: 'usr-patient-123',
      role: ProfileRole.PATIENT,
      full_name: 'Ananya Sharma',
      currency: 'INR',
    } as any,
  };

  const mockDoctorUser: AuthUser = {
    id: 'usr-doctor-456',
    email: 'doctor@example.com',
    profile: {
      id: 'usr-doctor-456',
      role: ProfileRole.DOCTOR,
      full_name: 'Dr. Priya Patel',
      currency: 'INR',
      kyc_verified: true,
    } as any,
  };

  beforeEach(async () => {
    const { supabase } = createSupabaseMock({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiEntitlementService,
        AiFeatureFlagService,
        AiSubscriptionService,
        AiUsageService,
        AiPricingService,
        AiCreditLedgerService,
        { provide: SupabaseService, useValue: supabase },
        { provide: FXRateService, useValue: { getRate: jest.fn().mockResolvedValue(86.5) } },
        { provide: CashfreeService, useValue: { createOrder: jest.fn() } },
        { provide: NotificationsService, useValue: { create: jest.fn().mockResolvedValue({}) } },
      ],
    }).compile();

    service = module.get<AiEntitlementService>(AiEntitlementService);
    featureFlagService = module.get<AiFeatureFlagService>(AiFeatureFlagService);
    usageService = module.get<AiUsageService>(AiUsageService);
    pricingService = module.get<AiPricingService>(AiPricingService);
    subscriptionService = module.get<AiSubscriptionService>(AiSubscriptionService);
  });

  describe('1. Global Feature Activation & Maintenance Gates', () => {
    it('denies access when a feature is disabled or archived', async () => {
      jest.spyOn(featureFlagService, 'getFlag').mockResolvedValueOnce({
        feature_key: AiFeatureKey.PATIENT_CHAT,
        name: 'AI Health Companion',
        description: 'Chat',
        is_enabled: false,
        required_plan: null,
        monthly_limit_free: 10,
        monthly_limit_premium: null,
        applicable_roles: ['patient'],
        credit_cost: 1,
        status: 'inactive',
      });

      const result = await service.canUseAIFeature(mockPatientUser, AiFeatureKey.PATIENT_CHAT);
      expect(result.hasAccess).toBe(false);
      expect(result.reason).toContain('temporarily unavailable');
    });

    it('denies access when user role is not in applicable_roles', async () => {
      // Doctor attempting to access a patient-exclusive feature
      const result = await service.canUseAIFeature(mockDoctorUser, AiFeatureKey.PATIENT_LAB_ANALYSIS);
      expect(result.hasAccess).toBe(false);
      expect(result.reason).toContain('exclusive to patient accounts');
    });
  });

  describe('2. Plan Feature Inclusion & Paywalls', () => {
    it('denies access when feature is not included in user plan', async () => {
      // Free patient attempting to use PATIENT_LAB_ANALYSIS which is not in patient_free
      const result = await service.canUseAIFeature(mockPatientUser, AiFeatureKey.PATIENT_LAB_ANALYSIS);
      expect(result.hasAccess).toBe(false);
      expect(result.reason).toContain('not included in your current plan');
      expect(result.paywallData).toBeDefined();
      expect(result.paywallData?.planName).toBe('Patient Pro');
    });

    it('throws PaymentRequiredException when enforceAccess fails', async () => {
      await expect(
        service.enforceAccess(mockPatientUser, AiFeatureKey.PATIENT_LAB_ANALYSIS),
      ).rejects.toThrow(PaymentRequiredException);
    });
  });

  describe('3. Dynamic Per-Plan Limits & Unlimited Support', () => {
    it('allows access for unlimited features on premium plan without usage caps', async () => {
      // Premium user with unlimited PATIENT_CHAT
      jest.spyOn(subscriptionService, 'getSubscription').mockResolvedValue({
        id: 'sub-prem',
        user_id: mockPatientUser.id,
        plan_id: 'patient_premium',
        role: 'patient',
        status: 'active',
        billing_cycle: 'monthly',
        current_period_start: new Date().toISOString(),
        current_period_end: null,
        monthly_ai_credits: 500,
        credits_used: 100,
      });
      jest.spyOn(pricingService, 'getPlan').mockResolvedValue({
        id: 'patient_premium',
        name: 'Patient Premium',
        features: [AiFeatureKey.PATIENT_CHAT],
        feature_limits: {
          [AiFeatureKey.PATIENT_CHAT]: { limit: null, is_unlimited: true, unit: 'messages' },
        },
      } as any);

      const result = await service.canUseAIFeature(mockPatientUser, AiFeatureKey.PATIENT_CHAT);
      expect(result.hasAccess).toBe(true);
      expect(result.isUnlimited).toBe(true);
      expect(result.monthlyLimit).toBeNull();
    });

    it('allows access when usage is within limited plan allowance', async () => {
      // Free user has 15 queries, has used 4
      jest.spyOn(usageService, 'getUserFeatureUsageCount').mockResolvedValueOnce(4);

      const result = await service.canUseAIFeature(mockPatientUser, AiFeatureKey.PATIENT_CHAT);
      expect(result.hasAccess).toBe(true);
      expect(result.isUnlimited).toBe(false);
      expect(result.monthlyLimit).toBe(15);
      expect(result.used).toBe(4);
    });

    it('blocks access when usage reaches or exceeds monthly limit', async () => {
      // Free user has 15 queries, has used 15
      jest.spyOn(usageService, 'getUserFeatureUsageCount').mockResolvedValueOnce(15);

      const result = await service.canUseAIFeature(mockPatientUser, AiFeatureKey.PATIENT_CHAT);
      expect(result.hasAccess).toBe(false);
      expect(result.isRateLimited).toBe(true);
      expect(result.reason).toContain('reached your monthly allowance of 15');
      expect(result.paywallData).toBeDefined();
    });
  });

  describe('4. getAIUsageLimit Resolution', () => {
    it('resolves correct limit, used, remaining, and units for a user and feature', async () => {
      jest.spyOn(usageService, 'getUserFeatureUsageCount').mockResolvedValueOnce(3);

      const limitInfo = await service.getAIUsageLimit(mockPatientUser, AiFeatureKey.PATIENT_CHAT);
      expect(limitInfo.isUnlimited).toBe(false);
      expect(limitInfo.limit).toBe(15);
      expect(limitInfo.used).toBe(3);
      expect(limitInfo.remaining).toBe(12);
      expect(limitInfo.unit).toBe('messages');
    });
  });
});
