-- 0087_update_plan_credits.sql
-- Optimizes AI Plan Credit Allocations for High-Volume Clinical OPD & Chronic Care

-- 1. Update Doctor Pro Plan (doctor_plan_2) from 100 to 150 credits
UPDATE public.ai_plans
SET
  included_monthly_credits = 150,
  feature_limits = '{
    "DOCTOR_RX_AUTOCOMPLETE": { "limit": 150, "is_unlimited": false, "unit": "uses" },
    "DOCTOR_DRUG_SAFETY": { "limit": 150, "is_unlimited": false, "unit": "uses" },
    "DOCTOR_PATIENT_BRIEF": { "limit": 150, "is_unlimited": false, "unit": "uses" },
    "DOCTOR_CONSULT_SUMMARY": { "limit": 150, "is_unlimited": false, "unit": "uses" }
  }'::jsonb,
  updated_at = now()
WHERE id = 'doctor_plan_2';

-- 2. Update Doctor Premium Plan (doctor_plan_3) from 300 to 500 credits
UPDATE public.ai_plans
SET
  included_monthly_credits = 500,
  feature_limits = '{
    "DOCTOR_RX_AUTOCOMPLETE": { "limit": 500, "is_unlimited": false, "unit": "uses" },
    "DOCTOR_DRUG_SAFETY": { "limit": 500, "is_unlimited": false, "unit": "uses" },
    "DOCTOR_PATIENT_BRIEF": { "limit": 500, "is_unlimited": false, "unit": "uses" },
    "DOCTOR_CONSULT_SUMMARY": { "limit": 500, "is_unlimited": false, "unit": "uses" },
    "DOCTOR_SOAP_NOTES": { "limit": 500, "is_unlimited": false, "unit": "uses" }
  }'::jsonb,
  updated_at = now()
WHERE id = 'doctor_plan_3';

-- 3. Upgrade active doctor subscriptions currently subscribed to these plans
UPDATE public.ai_subscriptions
SET
  monthly_ai_credits = 150,
  updated_at = now()
WHERE plan_id = 'doctor_plan_2' AND status = 'active';

UPDATE public.ai_subscriptions
SET
  monthly_ai_credits = 500,
  updated_at = now()
WHERE plan_id = 'doctor_plan_3' AND status = 'active';
