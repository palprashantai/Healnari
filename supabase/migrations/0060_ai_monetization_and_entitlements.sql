-- 0060_ai_monetization_and_entitlements.sql
-- AI Monetization, Entitlement, Prompt Management, Usage & Cost Control Engine

-- 1. AI Subscriptions Table
CREATE TABLE IF NOT EXISTS public.ai_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL DEFAULT 'free',          -- 'patient_free' | 'patient_premium' | 'doctor_free' | 'doctor_pro'
  role TEXT NOT NULL DEFAULT 'patient',          -- 'patient' | 'doctor'
  status TEXT NOT NULL DEFAULT 'active',         -- 'active' | 'cancelled' | 'expired' | 'trialing'
  billing_cycle TEXT NOT NULL DEFAULT 'monthly', -- 'monthly' | 'yearly' | 'lifetime'
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ,
  monthly_ai_credits INTEGER NOT NULL DEFAULT 5,
  credits_used INTEGER NOT NULL DEFAULT 0,
  payment_reference TEXT,                        -- reference id or payment_id in payments table
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_ai_subscriptions_user UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_subscriptions_user_role ON public.ai_subscriptions (user_id, role);
CREATE INDEX IF NOT EXISTS idx_ai_subscriptions_status ON public.ai_subscriptions (status);

-- 2. AI Usage Logs Table
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  feature TEXT NOT NULL,                         -- 'PATIENT_CHAT' | 'PATIENT_LAB_ANALYSIS' | 'PATIENT_CONSULT_PREP' | 'DOCTOR_SOAP_NOTES' etc.
  model TEXT DEFAULT 'gemini-1.5-flash',
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  estimated_cost_usd NUMERIC(10,6) DEFAULT 0,
  credits_deducted INTEGER DEFAULT 1,
  response_status TEXT DEFAULT 'success',        -- 'success' | 'error' | 'timeout' | 'rate_limited' | 'entitlement_denied'
  duration_ms INTEGER DEFAULT 0,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_date ON public.ai_usage_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_feature_date ON public.ai_usage_logs (feature, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at ON public.ai_usage_logs (created_at DESC);

-- 3. AI Feature Flags & Entitlements Configuration Table
CREATE TABLE IF NOT EXISTS public.ai_feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT UNIQUE NOT NULL,              -- 'PATIENT_CHAT' | 'PATIENT_LAB_ANALYSIS' | 'PATIENT_CONSULT_PREP' | 'DOCTOR_PATIENT_BRIEF' | 'DOCTOR_SOAP_NOTES' | 'DOCTOR_RX_AUTOCOMPLETE' | 'DOCTOR_DRUG_SAFETY' | 'DOCTOR_CONSULT_SUMMARY'
  name TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  required_plan TEXT,                            -- null = free tier accessible, 'patient_premium', 'doctor_pro'
  monthly_limit_free INTEGER DEFAULT 0,          -- null = unlimited, 0 = locked/disabled on free, N = max N queries/month
  monthly_limit_premium INTEGER,                 -- null = unlimited, N = cap
  applicable_roles TEXT[] NOT NULL DEFAULT '{"patient","doctor"}'::text[],
  credit_cost INTEGER NOT NULL DEFAULT 1,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_feature_flags_key ON public.ai_feature_flags (feature_key);

-- 4. AI Prompt Templates Table
CREATE TABLE IF NOT EXISTS public.ai_prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature TEXT NOT NULL,                         -- matches feature_key
  role TEXT NOT NULL DEFAULT 'all',              -- 'patient' | 'doctor' | 'admin' | 'all'
  version INTEGER NOT NULL DEFAULT 1,
  system_prompt TEXT NOT NULL,
  user_prompt_template TEXT,
  model TEXT NOT NULL DEFAULT 'gemini-1.5-flash',
  temperature NUMERIC(3,2) DEFAULT 0.2,
  max_tokens INTEGER DEFAULT 2048,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_ai_prompts_feature_role_version UNIQUE (feature, role, version)
);

CREATE INDEX IF NOT EXISTS idx_ai_prompt_templates_feature ON public.ai_prompt_templates (feature, is_active);

-- 5. AI Analytics Events Table
CREATE TABLE IF NOT EXISTS public.ai_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,                      -- 'AI_FEATURE_VIEWED' | 'AI_PAYWALL_VIEWED' | 'AI_UPGRADE_STARTED' | 'AI_UPGRADE_COMPLETED' | 'AI_LIMIT_REACHED' | 'AI_DOCTOR_APPROVED' | 'AI_DOCTOR_EDITED'
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT,
  feature TEXT,
  session_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_analytics_events_type ON public.ai_analytics_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_analytics_events_user ON public.ai_analytics_events (user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.ai_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analytics_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own AI subscription
CREATE POLICY "Users can view own AI subscription"
  ON public.ai_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view their own AI usage logs
CREATE POLICY "Users can view own AI usage"
  ON public.ai_usage_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Anyone authenticated can view active feature flags
CREATE POLICY "Authenticated users view feature flags"
  ON public.ai_feature_flags FOR SELECT
  USING (auth.role() = 'authenticated');

-- Service role full access
CREATE POLICY "Service role full access on ai_subscriptions"
  ON public.ai_subscriptions FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on ai_usage_logs"
  ON public.ai_usage_logs FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on ai_feature_flags"
  ON public.ai_feature_flags FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on ai_prompt_templates"
  ON public.ai_prompt_templates FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on ai_analytics_events"
  ON public.ai_analytics_events FOR ALL
  USING (auth.role() = 'service_role');

-- Seed Default Feature Flags
INSERT INTO public.ai_feature_flags (feature_key, name, description, is_enabled, required_plan, monthly_limit_free, monthly_limit_premium, applicable_roles, credit_cost)
VALUES
  ('PATIENT_CHAT', 'AI Health Companion', 'Interactive cycle, fertility, and wellness educational assistant', true, NULL, 5, 200, ARRAY['patient'], 1),
  ('PATIENT_LAB_ANALYSIS', 'AI Lab Report Decoder', 'Plain-language biomarker explanation with phase calibration and doctor questions', true, 'patient_premium', 0, NULL, ARRAY['patient'], 2),
  ('PATIENT_CONSULT_PREP', 'AI Visit Preparation', 'Pre-consultation symptom synthesis and tailored questions to ask your doctor', true, 'patient_premium', 0, NULL, ARRAY['patient'], 1),
  ('DOCTOR_PATIENT_BRIEF', 'AI Pre-Consult Brief', 'Clinical overview summarizing patient history, chronic conditions, and recent labs', true, 'doctor_pro', 0, NULL, ARRAY['doctor'], 1),
  ('DOCTOR_SOAP_NOTES', 'AI SOAP Note Assistant', 'Auto-generates structured Subjective, Objective, Assessment, and Plan notes', true, 'doctor_pro', 0, 50, ARRAY['doctor'], 2),
  ('DOCTOR_RX_AUTOCOMPLETE', 'AI Prescription Autocomplete', 'Smart evidence-based drug dosage, frequency, and instructions auto-completion', true, NULL, 10, NULL, ARRAY['doctor'], 1),
  ('DOCTOR_DRUG_SAFETY', 'AI Drug & Food Safety Shield', 'Food-drug interaction screening and optimal medication timing recommendations', true, NULL, 10, NULL, ARRAY['doctor'], 1),
  ('DOCTOR_CONSULT_SUMMARY', 'AI Post-Consult Summary', 'Plain-language summary of consult, doctor plan, and follow-up guidance', true, 'doctor_pro', 0, NULL, ARRAY['doctor'], 1)
ON CONFLICT (feature_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_enabled = EXCLUDED.is_enabled,
  required_plan = EXCLUDED.required_plan,
  monthly_limit_free = EXCLUDED.monthly_limit_free,
  monthly_limit_premium = EXCLUDED.monthly_limit_premium,
  applicable_roles = EXCLUDED.applicable_roles,
  credit_cost = EXCLUDED.credit_cost;

-- Seed Default Prompt Templates
INSERT INTO public.ai_prompt_templates (feature, role, version, system_prompt, user_prompt_template, model, temperature, max_tokens, is_active)
VALUES
  (
    'DOCTOR_SOAP_NOTES',
    'doctor',
    1,
    'You are an expert clinical documentation assistant for HealNari, a women''s telemedicine network. Your mission is to generate structured, evidence-based SOAP notes (Subjective, Objective, Assessment, Plan) and a 3-bullet plain-language Patient Action Plan. Always ground your assessment in medical facts. Return your final answer ONLY as valid JSON.',
    'Generate a SOAP consultation note for: Patient: {{patientName}}, Age: {{age}}, Chief Complaint: {{chiefComplaint}}, Symptoms: {{symptoms}}, Doctor Notes: {{doctorNotes}}, Chronic Conditions: {{chronicConditions}}, Medications: {{medications}}, Lab Results: {{labResults}}',
    'gemini-1.5-flash',
    0.2,
    2048,
    true
  ),
  (
    'PATIENT_LAB_ANALYSIS',
    'patient',
    1,
    'You are an empathetic medical education assistant for HealNari. Analyze the lab test report and explain it in clear, non-alarming, plain English for the patient. Never provide a definitive clinical diagnosis. Explain out-of-range values calmly with physiological context. Include 3 intelligent questions the patient can ask their doctor. Return ONLY a valid JSON object.',
    'Report Name: {{reportName}}\nCycle Phase Context: {{cyclePhase}}\nReport Content: {{reportText}}',
    'gemini-1.5-flash',
    0.2,
    2048,
    true
  ),
  (
    'PATIENT_CONSULT_PREP',
    'patient',
    1,
    'You are a compassionate Patient Consultation Preparation Assistant for HealNari. Your role is to help the patient organize their symptoms, timeline, and questions so they get the most value out of their doctor visit. Return your final answer ONLY as valid JSON.',
    'Prepare consultation brief for visit with {{doctorSpecialty}}. Patient reported concerns: {{concerns}}. Recent symptoms: {{symptoms}}. Questions in mind: {{patientQuestions}}.',
    'gemini-1.5-flash',
    0.2,
    1500,
    true
  )
ON CONFLICT (feature, role, version) DO UPDATE SET
  system_prompt = EXCLUDED.system_prompt,
  user_prompt_template = EXCLUDED.user_prompt_template,
  is_active = EXCLUDED.is_active;
