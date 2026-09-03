-- 0064_ai_feature_roles_alignment.sql
-- Non-destructive role alignment migration for AI feature flags.
-- Enables patient access to Medication & Food Safety Shield (DOCTOR_DRUG_SAFETY)
-- and doctor access to Consultation Preparation & Diagnostic Synthesis (PATIENT_CONSULT_PREP).

UPDATE public.ai_feature_flags
SET applicable_roles = ARRAY['doctor', 'patient'],
    updated_at = now()
WHERE feature_key = 'DOCTOR_DRUG_SAFETY';

UPDATE public.ai_feature_flags
SET applicable_roles = ARRAY['patient', 'doctor'],
    updated_at = now()
WHERE feature_key = 'PATIENT_CONSULT_PREP';
