-- 0086_multi_specialist_ai_intelligence.sql
-- Multi-Specialist Clinical AI Architecture & Longitudinal Health Tracking

-- 1. Longitudinal Patient Biomarker Trends Table
CREATE TABLE IF NOT EXISTS public.patient_biomarker_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  record_id UUID REFERENCES public.patient_records(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  biomarker_name TEXT NOT NULL,                  -- 'HbA1c', 'TSH', 'Fasting Glucose', 'Hemoglobin', 'LDL', etc.
  biomarker_category TEXT NOT NULL DEFAULT 'GENERAL', -- 'METABOLIC', 'HORMONAL', 'HEMATOLOGY', 'LIPID', 'HEPATIC', 'RENAL'
  numeric_value NUMERIC(12, 4) NOT NULL,
  unit TEXT NOT NULL,                            -- 'mg/dL', 'µIU/mL', 'g/dL', '%', etc.
  reference_low NUMERIC(12, 4),
  reference_high NUMERIC(12, 4),
  is_abnormal BOOLEAN GENERATED ALWAYS AS (
    (reference_low IS NOT NULL AND numeric_value < reference_low) OR
    (reference_high IS NOT NULL AND numeric_value > reference_high)
  ) STORED,
  notes TEXT,
  sampled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_biomarker_patient_name_date 
  ON public.patient_biomarker_trends (patient_id, biomarker_name, sampled_at DESC);
CREATE INDEX IF NOT EXISTS idx_biomarker_category 
  ON public.patient_biomarker_trends (patient_id, biomarker_category);

ALTER TABLE public.patient_biomarker_trends ENABLE ROW LEVEL SECURITY;

-- Patients can view their own biomarker trends
CREATE POLICY "Patients can view their own biomarker trends"
  ON public.patient_biomarker_trends FOR SELECT
  USING (auth.uid() = patient_id);

-- Doctors with a care relationship can view patient biomarker trends
CREATE POLICY "Doctors can view patient biomarker trends"
  ON public.patient_biomarker_trends FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.doctor_id = auth.uid()
        AND a.patient_id = patient_biomarker_trends.patient_id
        AND a.deleted_at IS NULL
    )
  );

-- Service role / Admin has full access
CREATE POLICY "Service role has full access to biomarker trends"
  ON public.patient_biomarker_trends FOR ALL
  USING (true)
  WITH CHECK (true);

-- 2. Immutable Clinical AI Audit Ledger
CREATE TABLE IF NOT EXISTS public.ai_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  role TEXT NOT NULL,                            -- 'doctor' | 'patient' | 'admin' | 'visitor'
  feature_key TEXT NOT NULL,                     -- 'DOCTOR_SOAP_NOTES', 'PATIENT_LAB_ANALYSIS', etc.
  specialty TEXT,                                -- 'General Physician', 'Gynecology', 'Endocrinology', 'Dermatology', etc.
  model_name TEXT NOT NULL DEFAULT 'gemini-1.5-flash',
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  latency_ms INTEGER DEFAULT 0,
  credits_deducted INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'SUCCESS',        -- 'SUCCESS' | 'FAILED' | 'RED_FLAG_DIVERTED' | 'REFUNDED'
  clinician_action TEXT,                         -- 'ACCEPTED', 'EDITED', 'REJECTED'
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_audit_user_feature 
  ON public.ai_audit_logs (user_id, feature_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_audit_req 
  ON public.ai_audit_logs (request_id);
CREATE INDEX IF NOT EXISTS idx_ai_audit_specialty 
  ON public.ai_audit_logs (specialty) WHERE specialty IS NOT NULL;

ALTER TABLE public.ai_audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all AI audit logs
CREATE POLICY "Admins can view all AI audit logs"
  ON public.ai_audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Service role has full access
CREATE POLICY "Service role has full access to ai_audit_logs"
  ON public.ai_audit_logs FOR ALL
  USING (true)
  WITH CHECK (true);
