-- ============================================================================
-- Migration 0080: Fix phi_audit_logs schema by adding target_patient_id column
-- ============================================================================
-- Resolves "Could not find the 'target_patient_id' column of 'phi_audit_logs' in the schema cache"
-- and restores full PHI audit log tracing for Patients, Doctors, and Admins.

ALTER TABLE public.phi_audit_logs
  ADD COLUMN IF NOT EXISTS target_patient_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS phi_audit_logs_patient_idx ON public.phi_audit_logs (target_patient_id);

-- Refresh PostgREST schema cache to ensure immediate recognition of new column
NOTIFY pgrst, 'reload schema';
