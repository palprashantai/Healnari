import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '@/core/supabase/supabase.service';
import {
  AiFeatureFlag,
  AiFeatureKey,
} from '@/modules/ai/interfaces/ai-monetization.interface';

export const DEFAULT_FEATURE_FLAGS: Record<string, AiFeatureFlag> = {
  [AiFeatureKey.PATIENT_CHAT]: {
    feature_key: AiFeatureKey.PATIENT_CHAT,
    name: 'AI Health Companion',
    description: 'Interactive cycle, fertility, and wellness educational assistant',
    is_enabled: true,
    required_plan: null,
    monthly_limit_free: 5,
    monthly_limit_premium: 200,
    applicable_roles: ['patient'],
    credit_cost: 1,
  },
  [AiFeatureKey.PATIENT_LAB_ANALYSIS]: {
    feature_key: AiFeatureKey.PATIENT_LAB_ANALYSIS,
    name: 'AI Lab Report Decoder',
    description: 'Plain-language biomarker explanation with phase calibration and doctor questions',
    is_enabled: true,
    required_plan: 'patient_premium',
    monthly_limit_free: 0,
    monthly_limit_premium: null,
    applicable_roles: ['patient'],
    credit_cost: 2,
  },
  [AiFeatureKey.PATIENT_CONSULT_PREP]: {
    feature_key: AiFeatureKey.PATIENT_CONSULT_PREP,
    name: 'AI Visit Preparation',
    description: 'Pre-consultation symptom synthesis and tailored questions to ask your doctor',
    is_enabled: true,
    required_plan: 'patient_premium',
    monthly_limit_free: 0,
    monthly_limit_premium: null,
    applicable_roles: ['patient'],
    credit_cost: 1,
  },
  [AiFeatureKey.DOCTOR_PATIENT_BRIEF]: {
    feature_key: AiFeatureKey.DOCTOR_PATIENT_BRIEF,
    name: 'AI Pre-Consult Brief',
    description: 'Clinical overview summarizing patient history, chronic conditions, and recent labs',
    is_enabled: true,
    required_plan: 'doctor_pro',
    monthly_limit_free: 0,
    monthly_limit_premium: null,
    applicable_roles: ['doctor'],
    credit_cost: 1,
  },
  [AiFeatureKey.DOCTOR_SOAP_NOTES]: {
    feature_key: AiFeatureKey.DOCTOR_SOAP_NOTES,
    name: 'AI SOAP Note Assistant',
    description: 'Auto-generates structured Subjective, Objective, Assessment, and Plan notes',
    is_enabled: true,
    required_plan: 'doctor_pro',
    monthly_limit_free: 0,
    monthly_limit_premium: 50,
    applicable_roles: ['doctor'],
    credit_cost: 2,
  },
  [AiFeatureKey.DOCTOR_RX_AUTOCOMPLETE]: {
    feature_key: AiFeatureKey.DOCTOR_RX_AUTOCOMPLETE,
    name: 'AI Prescription Autocomplete',
    description: 'Smart evidence-based drug dosage, frequency, and instructions auto-completion',
    is_enabled: true,
    required_plan: null,
    monthly_limit_free: 10,
    monthly_limit_premium: null,
    applicable_roles: ['doctor'],
    credit_cost: 1,
  },
  [AiFeatureKey.DOCTOR_DRUG_SAFETY]: {
    feature_key: AiFeatureKey.DOCTOR_DRUG_SAFETY,
    name: 'AI Drug & Food Safety Shield',
    description: 'Food-drug interaction screening and optimal medication timing recommendations',
    is_enabled: true,
    required_plan: null,
    monthly_limit_free: 10,
    monthly_limit_premium: null,
    applicable_roles: ['doctor'],
    credit_cost: 1,
  },
  [AiFeatureKey.DOCTOR_CONSULT_SUMMARY]: {
    feature_key: AiFeatureKey.DOCTOR_CONSULT_SUMMARY,
    name: 'AI Post-Consult Summary',
    description: 'Plain-language summary of consult, doctor plan, and follow-up guidance',
    is_enabled: true,
    required_plan: 'doctor_pro',
    monthly_limit_free: 0,
    monthly_limit_premium: null,
    applicable_roles: ['doctor'],
    credit_cost: 1,
  },
};

@Injectable()
export class AiFeatureFlagService {
  private readonly logger = new Logger(AiFeatureFlagService.name);
  private flagsCache: Map<string, AiFeatureFlag> = new Map();
  private lastCacheTime = 0;
  private readonly CACHE_TTL_MS = 60_000;

  constructor(private readonly supabase: SupabaseService) {
    // Initialize in-memory defaults
    for (const [key, flag] of Object.entries(DEFAULT_FEATURE_FLAGS)) {
      this.flagsCache.set(key, { ...flag });
    }
  }

  async getAllFlags(): Promise<AiFeatureFlag[]> {
    const now = Date.now();
    if (this.flagsCache.size > 0 && now - this.lastCacheTime < this.CACHE_TTL_MS) {
      return Array.from(this.flagsCache.values());
    }

    try {
      const { data, error } = await this.supabase.admin
        .from('ai_feature_flags')
        .select('*');

      if (!error && data && data.length > 0) {
        this.flagsCache.clear();
        for (const row of data) {
          this.flagsCache.set(row.feature_key, row);
        }
        this.lastCacheTime = now;
        return data;
      }
    } catch (err: any) {
      this.logger.warn(`Could not load ai_feature_flags from database, using resilient in-memory fallback: ${err?.message}`);
    }

    // Return in-memory flags if database table not yet populated
    return Array.from(this.flagsCache.values());
  }

  async getFlag(featureKey: string): Promise<AiFeatureFlag> {
    const flags = await this.getAllFlags();
    const found = this.flagsCache.get(featureKey) || DEFAULT_FEATURE_FLAGS[featureKey];
    if (found) return found;

    return {
      feature_key: featureKey,
      name: featureKey,
      description: 'Custom AI Feature',
      is_enabled: true,
      required_plan: null,
      monthly_limit_free: 5,
      monthly_limit_premium: null,
      applicable_roles: ['patient', 'doctor'],
      credit_cost: 1,
    };
  }

  async updateFlag(
    featureKey: string,
    updates: Partial<AiFeatureFlag>,
  ): Promise<AiFeatureFlag> {
    const current = await this.getFlag(featureKey);
    const updated: AiFeatureFlag = { ...current, ...updates, feature_key: featureKey };

    this.flagsCache.set(featureKey, updated);
    this.lastCacheTime = Date.now();

    try {
      await this.supabase.admin.from('ai_feature_flags').upsert(updated, {
        onConflict: 'feature_key',
      });
    } catch (err: any) {
      this.logger.warn(`Database upsert failed for ai_feature_flags (${featureKey}): ${err?.message}`);
    }

    return updated;
  }

  isEnabled(featureKey: string): boolean {
    const flag = this.flagsCache.get(featureKey) || DEFAULT_FEATURE_FLAGS[featureKey];
    return flag ? flag.is_enabled : true;
  }
}
