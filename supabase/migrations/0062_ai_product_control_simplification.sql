-- 0062_ai_product_control_simplification.sql
-- Enhances AI Product Control schema for non-technical admins:
-- 1. Adds usage_type, unit, is_system, and status to ai_feature_flags
-- 2. Adds feature_limits JSONB to ai_plans for dynamic per-plan limits (Limited vs Unlimited)

ALTER TABLE public.ai_feature_flags
  ADD COLUMN IF NOT EXISTS usage_type TEXT NOT NULL DEFAULT 'credits',
  ADD COLUMN IF NOT EXISTS unit TEXT NOT NULL DEFAULT 'credits',
  ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

ALTER TABLE public.ai_plans
  ADD COLUMN IF NOT EXISTS feature_limits JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Populate feature catalog attributes for standard system features
UPDATE public.ai_feature_flags
SET
  usage_type = 'messages',
  unit = 'messages',
  is_system = true,
  status = 'active'
WHERE feature_key = 'PATIENT_CHAT';

UPDATE public.ai_feature_flags
SET
  usage_type = 'documents',
  unit = 'documents',
  is_system = true,
  status = 'active'
WHERE feature_key = 'PATIENT_LAB_ANALYSIS';

UPDATE public.ai_feature_flags
SET
  usage_type = 'generations',
  unit = 'briefs',
  is_system = true,
  status = 'active'
WHERE feature_key = 'PATIENT_CONSULT_PREP';

UPDATE public.ai_feature_flags
SET
  usage_type = 'generations',
  unit = 'briefs',
  is_system = true,
  status = 'active'
WHERE feature_key = 'DOCTOR_PATIENT_BRIEF';

UPDATE public.ai_feature_flags
SET
  usage_type = 'documents',
  unit = 'notes',
  is_system = true,
  status = 'active'
WHERE feature_key = 'DOCTOR_SOAP_NOTES';

UPDATE public.ai_feature_flags
SET
  usage_type = 'calls',
  unit = 'prescriptions',
  is_system = true,
  status = 'active'
WHERE feature_key = 'DOCTOR_RX_AUTOCOMPLETE';

UPDATE public.ai_feature_flags
SET
  usage_type = 'calls',
  unit = 'checks',
  is_system = true,
  status = 'active'
WHERE feature_key = 'DOCTOR_DRUG_SAFETY';

UPDATE public.ai_feature_flags
SET
  usage_type = 'generations',
  unit = 'summaries',
  is_system = true,
  status = 'active'
WHERE feature_key = 'DOCTOR_CONSULT_SUMMARY';

-- Populate clean, dynamic feature_limits for existing AI Plans
UPDATE public.ai_plans
SET feature_limits = '{
  "PATIENT_CHAT": { "limit": 10, "is_unlimited": false, "unit": "messages" }
}'::jsonb
WHERE id = 'patient_free';

UPDATE public.ai_plans
SET feature_limits = '{
  "PATIENT_CHAT": { "limit": null, "is_unlimited": true, "unit": "messages" },
  "PATIENT_LAB_ANALYSIS": { "limit": null, "is_unlimited": true, "unit": "documents" },
  "PATIENT_CONSULT_PREP": { "limit": null, "is_unlimited": true, "unit": "briefs" }
}'::jsonb
WHERE id IN ('patient_premium', 'patient_premium_yearly');

UPDATE public.ai_plans
SET feature_limits = '{
  "DOCTOR_RX_AUTOCOMPLETE": { "limit": 20, "is_unlimited": false, "unit": "prescriptions" },
  "DOCTOR_DRUG_SAFETY": { "limit": 20, "is_unlimited": false, "unit": "checks" }
}'::jsonb
WHERE id = 'doctor_free';

UPDATE public.ai_plans
SET feature_limits = '{
  "DOCTOR_PATIENT_BRIEF": { "limit": null, "is_unlimited": true, "unit": "briefs" },
  "DOCTOR_SOAP_NOTES": { "limit": 50, "is_unlimited": false, "unit": "notes" },
  "DOCTOR_RX_AUTOCOMPLETE": { "limit": null, "is_unlimited": true, "unit": "prescriptions" },
  "DOCTOR_DRUG_SAFETY": { "limit": null, "is_unlimited": true, "unit": "checks" },
  "DOCTOR_CONSULT_SUMMARY": { "limit": null, "is_unlimited": true, "unit": "summaries" }
}'::jsonb
WHERE id IN ('doctor_pro', 'doctor_pro_yearly');
