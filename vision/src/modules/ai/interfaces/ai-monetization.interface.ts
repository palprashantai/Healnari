export enum AiFeatureKey {
  PATIENT_CHAT = 'PATIENT_CHAT',
  PATIENT_LAB_ANALYSIS = 'PATIENT_LAB_ANALYSIS',
  PATIENT_CONSULT_PREP = 'PATIENT_CONSULT_PREP',
  DOCTOR_PATIENT_BRIEF = 'DOCTOR_PATIENT_BRIEF',
  DOCTOR_SOAP_NOTES = 'DOCTOR_SOAP_NOTES',
  DOCTOR_RX_AUTOCOMPLETE = 'DOCTOR_RX_AUTOCOMPLETE',
  DOCTOR_DRUG_SAFETY = 'DOCTOR_DRUG_SAFETY',
  DOCTOR_CONSULT_SUMMARY = 'DOCTOR_CONSULT_SUMMARY',
}

export enum AiPlanId {
  DOCTOR_PLAN_1 = 'doctor_plan_1',
  DOCTOR_PLAN_2 = 'doctor_plan_2',
  DOCTOR_PLAN_3 = 'doctor_plan_3',
  PATIENT_PLAN_1 = 'patient_plan_1',
  PATIENT_PLAN_2 = 'patient_plan_2',
  PATIENT_PLAN_3 = 'patient_plan_3',
  // Backwards compatibility aliases
  DOCTOR_FREE = 'doctor_plan_1',
  DOCTOR_PRO = 'doctor_plan_2',
  PATIENT_FREE = 'patient_plan_1',
  PATIENT_PREMIUM = 'patient_plan_2',
}

export interface AiFeatureFlag {
  id?: string;
  feature_key: string;
  name: string;
  description: string;
  is_enabled: boolean;
  required_plan: string | null;
  monthly_limit_free: number | null;
  monthly_limit_premium: number | null;
  applicable_roles: string[];
  credit_cost: number;
  usage_type?: 'messages' | 'documents' | 'credits' | 'generations' | 'calls' | string;
  unit?: string;
  is_system?: boolean;
  status?: 'active' | 'inactive' | 'archived';
  metadata?: Record<string, any>;
}

export interface AiSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  role: string;
  status: 'active' | 'cancelled' | 'expired' | 'trialing';
  billing_cycle: 'monthly' | 'yearly' | 'lifetime';
  current_period_start: Date | string;
  current_period_end: Date | string | null;
  monthly_ai_credits: number;
  credits_used: number;
  payment_reference?: string | null;
  currency?: 'INR' | 'USD';
  amount?: number;
  cancel_at_period_end?: boolean;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export interface AiUsageLog {
  id?: string;
  user_id: string;
  role: string;
  feature: string;
  model?: string;
  input_tokens?: number;
  output_tokens?: number;
  estimated_cost_usd?: number;
  credits_deducted?: number;
  response_status?: string;
  duration_ms?: number;
  appointment_id?: string | null;
  metadata?: Record<string, any>;
}

export interface AiPromptTemplate {
  id?: string;
  feature: string;
  role: string;
  version: number;
  system_prompt: string;
  user_prompt_template?: string;
  model: string;
  temperature: number;
  max_tokens: number;
  is_active: boolean;
}

export interface AiEntitlementCheckResult {
  hasAccess: boolean;
  reason?: string;
  featureKey: string;
  featureName: string;
  requiredPlan: string | null;
  userPlan: string;
  creditsRemaining: number;
  monthlyLimit: number | null;
  isRateLimited: boolean;
  isUnlimited?: boolean;
  unit?: string;
  usageType?: string;
  used?: number;
  paywallData?: {
    title: string;
    description: string;
    planName: string;
    price: string;
    priceAmount: number;
    billingCycle: string;
    currency: string;
    features: string[];
    upgradeUrl: string;
  };
}

export interface AiResponseEnvelope<T = any> {
  data: T;
  meta: {
    feature: string;
    creditsUsed: number;
    creditsRemaining: number;
    userPlan: string;
    disclaimer?: string;
    model?: string;
    cached?: boolean;
    durationMs?: number;
  };
}
