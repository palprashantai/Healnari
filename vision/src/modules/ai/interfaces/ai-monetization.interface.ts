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
  PATIENT_FREE = 'patient_free',
  PATIENT_PREMIUM = 'patient_premium',
  DOCTOR_FREE = 'doctor_free',
  DOCTOR_PRO = 'doctor_pro',
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
