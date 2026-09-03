-- 0065_six_plans_consolidation.sql
-- AI Healthcare Product + Plan System: Simplification to Exactly 6 Plans
-- 3 Doctor Plans & 3 Patient Plans with strict role separation and unified 1-use accounting

-- 1. Ensure canonical 6 plans in ai_plans table
INSERT INTO public.ai_plans (id, product_id, name, description, billing_cycle, plan_type, included_monthly_credits, is_active, is_public, plan_version, features, feature_limits)
VALUES
  -- ── DOCTOR PLANS ──
  (
    'doctor_plan_1',
    'prod_doctor_ai',
    'Doctor Starter',
    'Essential clinical tools with prescription autocomplete and drug-food safety checks',
    'monthly',
    'subscription',
    25,
    true,
    true,
    1,
    '{"DOCTOR_RX_AUTOCOMPLETE","DOCTOR_DRUG_SAFETY"}'::text[],
    '{
      "DOCTOR_RX_AUTOCOMPLETE": { "limit": 25, "is_unlimited": false, "unit": "uses" },
      "DOCTOR_DRUG_SAFETY": { "limit": 25, "is_unlimited": false, "unit": "uses" }
    }'::jsonb
  ),
  (
    'doctor_plan_2',
    'prod_doctor_ai',
    'Doctor Pro',
    'High-volume clinical workflow automation with pre-consult briefs and post-consult summaries',
    'monthly',
    'subscription',
    100,
    true,
    true,
    1,
    '{"DOCTOR_RX_AUTOCOMPLETE","DOCTOR_DRUG_SAFETY","DOCTOR_PATIENT_BRIEF","DOCTOR_CONSULT_SUMMARY"}'::text[],
    '{
      "DOCTOR_RX_AUTOCOMPLETE": { "limit": 100, "is_unlimited": false, "unit": "uses" },
      "DOCTOR_DRUG_SAFETY": { "limit": 100, "is_unlimited": false, "unit": "uses" },
      "DOCTOR_PATIENT_BRIEF": { "limit": 100, "is_unlimited": false, "unit": "uses" },
      "DOCTOR_CONSULT_SUMMARY": { "limit": 100, "is_unlimited": false, "unit": "uses" }
    }'::jsonb
  ),
  (
    'doctor_plan_3',
    'prod_doctor_ai',
    'Doctor Premium',
    'Full clinical intelligence with automated SOAP note generation and comprehensive practice documentation',
    'monthly',
    'subscription',
    300,
    true,
    true,
    1,
    '{"DOCTOR_RX_AUTOCOMPLETE","DOCTOR_DRUG_SAFETY","DOCTOR_PATIENT_BRIEF","DOCTOR_CONSULT_SUMMARY","DOCTOR_SOAP_NOTES"}'::text[],
    '{
      "DOCTOR_RX_AUTOCOMPLETE": { "limit": 300, "is_unlimited": false, "unit": "uses" },
      "DOCTOR_DRUG_SAFETY": { "limit": 300, "is_unlimited": false, "unit": "uses" },
      "DOCTOR_PATIENT_BRIEF": { "limit": 300, "is_unlimited": false, "unit": "uses" },
      "DOCTOR_CONSULT_SUMMARY": { "limit": 300, "is_unlimited": false, "unit": "uses" },
      "DOCTOR_SOAP_NOTES": { "limit": 300, "is_unlimited": false, "unit": "uses" }
    }'::jsonb
  ),

  -- ── PATIENT PLANS ──
  (
    'patient_plan_1',
    'prod_patient_ai',
    'Patient Basic',
    'Free introductory cycle companion and women wellness educational guidance',
    'monthly',
    'subscription',
    15,
    true,
    true,
    1,
    '{"PATIENT_CHAT"}'::text[],
    '{
      "PATIENT_CHAT": { "limit": 15, "is_unlimited": false, "unit": "uses" }
    }'::jsonb
  ),
  (
    'patient_plan_2',
    'prod_patient_ai',
    'Patient Pro',
    'Comprehensive health companion with AI lab report decoder and visit preparation briefs',
    'monthly',
    'subscription',
    60,
    true,
    true,
    1,
    '{"PATIENT_CHAT","PATIENT_LAB_ANALYSIS","PATIENT_CONSULT_PREP"}'::text[],
    '{
      "PATIENT_CHAT": { "limit": 60, "is_unlimited": false, "unit": "uses" },
      "PATIENT_LAB_ANALYSIS": { "limit": 60, "is_unlimited": false, "unit": "uses" },
      "PATIENT_CONSULT_PREP": { "limit": 60, "is_unlimited": false, "unit": "uses" }
    }'::jsonb
  ),
  (
    'patient_plan_3',
    'prod_patient_ai',
    'Patient Premium',
    'Continuous VIP care with unlimited in-depth symptom analysis and priority health guidance',
    'monthly',
    'subscription',
    150,
    true,
    true,
    1,
    '{"PATIENT_CHAT","PATIENT_LAB_ANALYSIS","PATIENT_CONSULT_PREP"}'::text[],
    '{
      "PATIENT_CHAT": { "limit": 150, "is_unlimited": false, "unit": "uses" },
      "PATIENT_LAB_ANALYSIS": { "limit": 150, "is_unlimited": false, "unit": "uses" },
      "PATIENT_CONSULT_PREP": { "limit": 150, "is_unlimited": false, "unit": "uses" }
    }'::jsonb
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  billing_cycle = 'monthly',
  plan_type = 'subscription',
  included_monthly_credits = EXCLUDED.included_monthly_credits,
  is_active = true,
  is_public = true,
  features = EXCLUDED.features,
  feature_limits = EXCLUDED.feature_limits,
  updated_at = now();

-- 2. Deactivate obsolete plans (yearly and token packs) so only the 6 canonical plans are public/active
UPDATE public.ai_plans
SET is_active = false, is_public = false, updated_at = now()
WHERE id IN (
  'patient_premium_yearly',
  'doctor_pro_yearly',
  'pack_100',
  'pack_500',
  'pack_1000'
);

-- 3. Regional Pricing for Exactly the 6 Canonical Plans (INR & USD)
-- Doctor Plan 1 (Starter - Free)
INSERT INTO public.ai_regional_prices (plan_id, country_code, currency, base_amount, price_version, is_active)
VALUES
  ('doctor_plan_1', 'IN', 'INR', 0.00, 1, true),
  ('doctor_plan_1', 'US', 'USD', 0.00, 1, true)
ON CONFLICT (plan_id, country_code, currency, price_version) DO UPDATE SET
  base_amount = 0.00, is_active = true, updated_at = now();

-- Doctor Plan 2 (Pro - ₹1,499 / $19)
INSERT INTO public.ai_regional_prices (plan_id, country_code, currency, base_amount, price_version, is_active)
VALUES
  ('doctor_plan_2', 'IN', 'INR', 1499.00, 1, true),
  ('doctor_plan_2', 'US', 'USD', 19.00, 1, true)
ON CONFLICT (plan_id, country_code, currency, price_version) DO UPDATE SET
  base_amount = EXCLUDED.base_amount, is_active = true, updated_at = now();

-- Doctor Plan 3 (Premium - ₹2,999 / $39)
INSERT INTO public.ai_regional_prices (plan_id, country_code, currency, base_amount, price_version, is_active)
VALUES
  ('doctor_plan_3', 'IN', 'INR', 2999.00, 1, true),
  ('doctor_plan_3', 'US', 'USD', 39.00, 1, true)
ON CONFLICT (plan_id, country_code, currency, price_version) DO UPDATE SET
  base_amount = EXCLUDED.base_amount, is_active = true, updated_at = now();

-- Patient Plan 1 (Basic - Free)
INSERT INTO public.ai_regional_prices (plan_id, country_code, currency, base_amount, price_version, is_active)
VALUES
  ('patient_plan_1', 'IN', 'INR', 0.00, 1, true),
  ('patient_plan_1', 'US', 'USD', 0.00, 1, true)
ON CONFLICT (plan_id, country_code, currency, price_version) DO UPDATE SET
  base_amount = 0.00, is_active = true, updated_at = now();

-- Patient Plan 2 (Pro - ₹499 / $7)
INSERT INTO public.ai_regional_prices (plan_id, country_code, currency, base_amount, price_version, is_active)
VALUES
  ('patient_plan_2', 'IN', 'INR', 499.00, 1, true),
  ('patient_plan_2', 'US', 'USD', 7.00, 1, true)
ON CONFLICT (plan_id, country_code, currency, price_version) DO UPDATE SET
  base_amount = EXCLUDED.base_amount, is_active = true, updated_at = now();

-- Patient Plan 3 (Premium - ₹999 / $14)
INSERT INTO public.ai_regional_prices (plan_id, country_code, currency, base_amount, price_version, is_active)
VALUES
  ('patient_plan_3', 'IN', 'INR', 999.00, 1, true),
  ('patient_plan_3', 'US', 'USD', 14.00, 1, true)
ON CONFLICT (plan_id, country_code, currency, price_version) DO UPDATE SET
  base_amount = EXCLUDED.base_amount, is_active = true, updated_at = now();

-- 4. Re-align feature flags to strict role separation and unified 1-use cost
UPDATE public.ai_feature_flags
SET applicable_roles = ARRAY['patient'],
    credit_cost = 1,
    unit = 'uses',
    usage_type = 'uses',
    updated_at = now()
WHERE feature_key IN ('PATIENT_CHAT', 'PATIENT_LAB_ANALYSIS', 'PATIENT_CONSULT_PREP');

UPDATE public.ai_feature_flags
SET applicable_roles = ARRAY['doctor'],
    credit_cost = 1,
    unit = 'uses',
    usage_type = 'uses',
    updated_at = now()
WHERE feature_key IN (
  'DOCTOR_PATIENT_BRIEF',
  'DOCTOR_SOAP_NOTES',
  'DOCTOR_RX_AUTOCOMPLETE',
  'DOCTOR_DRUG_SAFETY',
  'DOCTOR_CONSULT_SUMMARY'
);

-- 5. Migrate existing subscriptions to canonical plan IDs
UPDATE public.ai_subscriptions
SET plan_id = 'patient_plan_1',
    monthly_ai_credits = 15,
    updated_at = now()
WHERE plan_id = 'patient_free' OR (role = 'patient' AND (plan_id IS NULL OR plan_id = 'free'));

UPDATE public.ai_subscriptions
SET plan_id = 'patient_plan_2',
    monthly_ai_credits = 60,
    updated_at = now()
WHERE plan_id IN ('patient_premium', 'patient_premium_yearly');

UPDATE public.ai_subscriptions
SET plan_id = 'doctor_plan_1',
    monthly_ai_credits = 25,
    updated_at = now()
WHERE plan_id = 'doctor_free' OR (role = 'doctor' AND (plan_id IS NULL OR plan_id = 'free'));

UPDATE public.ai_subscriptions
SET plan_id = 'doctor_plan_2',
    monthly_ai_credits = 100,
    updated_at = now()
WHERE plan_id IN ('doctor_pro', 'doctor_pro_yearly');
