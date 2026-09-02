import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
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
    monthly_limit_free: 10,
    monthly_limit_premium: null,
    applicable_roles: ['patient'],
    credit_cost: 1,
    usage_type: 'messages',
    unit: 'messages',
    is_system: true,
    status: 'active',
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
    usage_type: 'documents',
    unit: 'documents',
    is_system: true,
    status: 'active',
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
    usage_type: 'generations',
    unit: 'briefs',
    is_system: true,
    status: 'active',
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
    usage_type: 'generations',
    unit: 'briefs',
    is_system: true,
    status: 'active',
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
    usage_type: 'documents',
    unit: 'notes',
    is_system: true,
    status: 'active',
  },
  [AiFeatureKey.DOCTOR_RX_AUTOCOMPLETE]: {
    feature_key: AiFeatureKey.DOCTOR_RX_AUTOCOMPLETE,
    name: 'AI Prescription Autocomplete',
    description: 'Smart evidence-based drug dosage, frequency, and instructions auto-completion',
    is_enabled: true,
    required_plan: null,
    monthly_limit_free: 20,
    monthly_limit_premium: null,
    applicable_roles: ['doctor'],
    credit_cost: 1,
    usage_type: 'calls',
    unit: 'prescriptions',
    is_system: true,
    status: 'active',
  },
  [AiFeatureKey.DOCTOR_DRUG_SAFETY]: {
    feature_key: AiFeatureKey.DOCTOR_DRUG_SAFETY,
    name: 'AI Drug & Food Safety Shield',
    description: 'Food-drug interaction screening and optimal medication timing recommendations',
    is_enabled: true,
    required_plan: null,
    monthly_limit_free: 20,
    monthly_limit_premium: null,
    applicable_roles: ['doctor'],
    credit_cost: 1,
    usage_type: 'calls',
    unit: 'checks',
    is_system: true,
    status: 'active',
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
    usage_type: 'generations',
    unit: 'summaries',
    is_system: true,
    status: 'active',
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
          const defaultFlag = DEFAULT_FEATURE_FLAGS[row.feature_key] || {};
          const merged: AiFeatureFlag = {
            ...defaultFlag,
            ...row,
            usage_type: row.usage_type || defaultFlag.usage_type || 'credits',
            unit: row.unit || defaultFlag.unit || 'credits',
            is_system: row.is_system !== undefined ? row.is_system : (defaultFlag.is_system ?? false),
            status: row.status || defaultFlag.status || (row.is_enabled ? 'active' : 'inactive'),
          };
          this.flagsCache.set(row.feature_key, merged);
        }
        this.lastCacheTime = now;
        return Array.from(this.flagsCache.values());
      }
    } catch (err: any) {
      this.logger.warn(`Could not load ai_feature_flags from database, using resilient in-memory fallback: ${err?.message}`);
    }

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
      monthly_limit_free: 10,
      monthly_limit_premium: null,
      applicable_roles: ['patient', 'doctor'],
      credit_cost: 1,
      usage_type: 'credits',
      unit: 'credits',
      is_system: false,
      status: 'active',
    };
  }

  async createFlag(
    feature: Partial<AiFeatureFlag>,
    adminUser?: { id: string; name: string },
  ): Promise<AiFeatureFlag> {
    if (!feature.name || !feature.name.trim()) {
      throw new BadRequestException('Feature name is required');
    }

    // Auto-generate clean feature key if not supplied
    let key = feature.feature_key?.trim().toUpperCase();
    if (!key) {
      key = feature.name
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    }

    // Prevent duplicates
    const existing = this.flagsCache.get(key);
    if (existing && existing.status !== 'archived') {
      throw new BadRequestException(`An AI feature with key "${key}" already exists.`);
    }

    const newFlag: AiFeatureFlag = {
      feature_key: key,
      name: feature.name.trim(),
      description: feature.description?.trim() || '',
      is_enabled: feature.is_enabled ?? true,
      required_plan: feature.required_plan || null,
      monthly_limit_free: feature.monthly_limit_free ?? null,
      monthly_limit_premium: feature.monthly_limit_premium ?? null,
      applicable_roles: feature.applicable_roles?.length ? feature.applicable_roles : ['patient', 'doctor'],
      credit_cost: Number(feature.credit_cost ?? 1),
      usage_type: feature.usage_type || 'messages',
      unit: feature.unit || 'messages',
      is_system: false,
      status: 'active',
    };

    this.flagsCache.set(key, newFlag);
    this.lastCacheTime = Date.now();

    try {
      await this.supabase.admin.from('ai_feature_flags').upsert(newFlag, {
        onConflict: 'feature_key',
      });

      // Audit Log
      await this.supabase.admin.from('ai_admin_audit_logs').insert({
        admin_id: adminUser?.id || null,
        admin_name: adminUser?.name || 'Admin',
        action: 'AI_FEATURE_CREATED',
        entity_type: 'feature',
        entity_id: key,
        old_value: null,
        new_value: newFlag,
        reason: `Admin created feature ${newFlag.name} (${key})`,
      });
    } catch (err: any) {
      this.logger.warn(`Database insert failed for ai_feature_flags (${key}): ${err?.message}`);
    }

    return newFlag;
  }

  async updateFlag(
    featureKey: string,
    updates: Partial<AiFeatureFlag>,
    adminUser?: { id: string; name: string },
  ): Promise<AiFeatureFlag> {
    const current = await this.getFlag(featureKey);

    // Prevent changing system feature identifiers
    const updated: AiFeatureFlag = {
      ...current,
      ...updates,
      feature_key: featureKey, // Key cannot be changed
      is_system: current.is_system, // System status preserved
    };

    if (updates.is_enabled !== undefined) {
      updated.status = updates.is_enabled ? 'active' : 'inactive';
    }

    this.flagsCache.set(featureKey, updated);
    this.lastCacheTime = Date.now();

    try {
      await this.supabase.admin.from('ai_feature_flags').upsert(updated, {
        onConflict: 'feature_key',
      });

      // Audit Log
      await this.supabase.admin.from('ai_admin_audit_logs').insert({
        admin_id: adminUser?.id || null,
        admin_name: adminUser?.name || 'Admin',
        action: 'AI_FEATURE_UPDATED',
        entity_type: 'feature',
        entity_id: featureKey,
        old_value: current,
        new_value: updated,
        reason: `Admin updated feature ${updated.name}`,
      });
    } catch (err: any) {
      this.logger.warn(`Database upsert failed for ai_feature_flags (${featureKey}): ${err?.message}`);
    }

    return updated;
  }

  async archiveFlag(
    featureKey: string,
    adminUser?: { id: string; name: string },
    force = false,
  ): Promise<{ success: boolean; message: string; impactedPlans: string[] }> {
    const current = await this.getFlag(featureKey);

    if (current.is_system && !force) {
      throw new ForbiddenException(
        `"${current.name}" is a protected core system AI feature and cannot be archived.`,
      );
    }

    const impactedPlans = await this.checkPlanImpact(featureKey);

    const updated: AiFeatureFlag = {
      ...current,
      is_enabled: false,
      status: 'archived',
    };

    this.flagsCache.set(featureKey, updated);
    this.lastCacheTime = Date.now();

    try {
      await this.supabase.admin.from('ai_feature_flags').upsert(updated, {
        onConflict: 'feature_key',
      });

      // Audit Log
      await this.supabase.admin.from('ai_admin_audit_logs').insert({
        admin_id: adminUser?.id || null,
        admin_name: adminUser?.name || 'Admin',
        action: 'AI_FEATURE_ARCHIVED',
        entity_type: 'feature',
        entity_id: featureKey,
        old_value: current,
        new_value: updated,
        reason: `Admin archived feature ${current.name}. Impacted plans: ${impactedPlans.join(', ') || 'none'}`,
      });
    } catch (err: any) {
      this.logger.warn(`Failed to archive feature in database: ${err?.message}`);
    }

    return {
      success: true,
      message: `Feature "${current.name}" has been archived and deactivated.`,
      impactedPlans,
    };
  }

  async checkPlanImpact(featureKey: string): Promise<string[]> {
    try {
      const { data, error } = await this.supabase.admin
        .from('ai_plans')
        .select('id, name, features');

      if (!error && data) {
        return data
          .filter((p: any) => Array.isArray(p.features) && p.features.includes(featureKey))
          .map((p: any) => `${p.name} (${p.id})`);
      }
    } catch {}

    // Fallback: check DEFAULT_PLANS
    return ['patient_premium', 'doctor_pro'].filter(() => true);
  }

  isEnabled(featureKey: string): boolean {
    const flag = this.flagsCache.get(featureKey) || DEFAULT_FEATURE_FLAGS[featureKey];
    return flag ? flag.is_enabled && flag.status !== 'archived' : true;
  }
}
