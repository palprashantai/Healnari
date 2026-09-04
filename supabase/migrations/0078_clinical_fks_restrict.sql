-- Migration 0078: Healthcare Data Integrity
-- Modifies ON DELETE CASCADE to ON DELETE RESTRICT for critical clinical records
-- to ensure a profile deletion does not accidentally destroy historical medical records.

ALTER TABLE public.prescriptions DROP CONSTRAINT IF EXISTS prescriptions_patient_id_fkey;
ALTER TABLE public.prescriptions ADD CONSTRAINT prescriptions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;

ALTER TABLE public.lab_reports DROP CONSTRAINT IF EXISTS lab_reports_patient_id_fkey;
ALTER TABLE public.lab_reports ADD CONSTRAINT lab_reports_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;

ALTER TABLE public.clinical_notes DROP CONSTRAINT IF EXISTS clinical_notes_patient_id_fkey;
ALTER TABLE public.clinical_notes ADD CONSTRAINT clinical_notes_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;

ALTER TABLE public.cycle_logs DROP CONSTRAINT IF EXISTS cycle_logs_patient_id_fkey;
ALTER TABLE public.cycle_logs ADD CONSTRAINT cycle_logs_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;
