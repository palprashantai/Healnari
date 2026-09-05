-- Migration: 0081_clinical_safety_status
-- Purpose: Hardens the state machines, data integrity, and immutability for clinical records per audit.

-- 1. Prescriptions Status Hardening
ALTER TABLE public.prescriptions DROP CONSTRAINT IF EXISTS prescriptions_status_check;
ALTER TABLE public.prescriptions ADD CONSTRAINT prescriptions_status_check 
  CHECK (status IN ('Draft', 'Finalized', 'Cancelled', 'Active', 'Expired'));

-- 2. Lab Reports Status Hardening
ALTER TABLE public.lab_reports DROP CONSTRAINT IF EXISTS lab_reports_status_check;
ALTER TABLE public.lab_reports ADD CONSTRAINT lab_reports_status_check 
  CHECK (status IN ('Ordered', 'Sample Collected', 'Processing', 'Report Available', 'Reviewed', 'Cancelled', 'Pending', 'Completed'));

-- Add report_url for secure file references if it doesn't exist
ALTER TABLE public.lab_reports ADD COLUMN IF NOT EXISTS report_url text;

-- 3. Ensure lab_report_requests table exists (if migration 0014 was not yet applied to this DB)
CREATE TABLE IF NOT EXISTS public.lab_report_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES public.profiles(id),
  patient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  requested_tests text NOT NULL,
  due_date date,
  notes text,
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Fulfilled', 'Cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lab_report_requests_patient_idx ON public.lab_report_requests (patient_id);
CREATE INDEX IF NOT EXISTS lab_report_requests_doctor_idx ON public.lab_report_requests (doctor_id);

ALTER TABLE public.lab_report_requests ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'lab_report_requests' AND policyname = 'lab_report_requests_select_own'
  ) THEN
    CREATE POLICY "lab_report_requests_select_own" ON public.lab_report_requests
      FOR SELECT USING (patient_id = auth.uid() OR doctor_id = auth.uid() OR public.current_app_role() = 'doctor');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'lab_report_requests' AND policyname = 'lab_report_requests_write_doctor'
  ) THEN
    CREATE POLICY "lab_report_requests_write_doctor" ON public.lab_report_requests
      FOR ALL USING (public.current_app_role() = 'doctor') WITH CHECK (public.current_app_role() = 'doctor');
  END IF;
END $$;

-- 4. Remove Dangerous Cascading Deletes on Core Clinical Records
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_patient_id_fkey;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;

ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_doctor_id_fkey;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;

ALTER TABLE public.lab_report_requests DROP CONSTRAINT IF EXISTS lab_report_requests_patient_id_fkey;
ALTER TABLE public.lab_report_requests ADD CONSTRAINT lab_report_requests_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;

-- 5. Clinical Linkages: Add appointment_id to associate records directly with consultations
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS appointment_id uuid REFERENCES public.appointments(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS prescriptions_appointment_idx ON public.prescriptions(appointment_id);

ALTER TABLE public.lab_report_requests ADD COLUMN IF NOT EXISTS appointment_id uuid REFERENCES public.appointments(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS lab_report_requests_appointment_idx ON public.lab_report_requests(appointment_id);

ALTER TABLE public.lab_reports ADD COLUMN IF NOT EXISTS appointment_id uuid REFERENCES public.appointments(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS lab_reports_appointment_idx ON public.lab_reports(appointment_id);

ALTER TABLE public.lab_reports ADD COLUMN IF NOT EXISTS request_id uuid REFERENCES public.lab_report_requests(id);

-- 6. Trigger: Enforce Immutability of Finalized Prescriptions
CREATE OR REPLACE FUNCTION public.check_prescription_immutability()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'Finalized' THEN
    -- Disallow reverting status to Draft or arbitrary states
    IF NEW.status NOT IN ('Finalized', 'Cancelled') THEN
      RAISE EXCEPTION 'Cannot change status of a finalized prescription to %', NEW.status;
    END IF;
    -- Disallow modifying clinical payload once Finalized
    IF NEW.status = OLD.status AND (
         NEW.med_name IS DISTINCT FROM OLD.med_name OR
         NEW.dosage IS DISTINCT FROM OLD.dosage OR
         NEW.schedule IS DISTINCT FROM OLD.schedule OR
         NEW.duration IS DISTINCT FROM OLD.duration OR
         NEW.instructions IS DISTINCT FROM OLD.instructions OR
         NEW.patient_id IS DISTINCT FROM OLD.patient_id OR
         NEW.doctor_id IS DISTINCT FROM OLD.doctor_id
       ) THEN
      RAISE EXCEPTION 'Cannot modify clinical content of a finalized prescription. It must be cancelled or a new prescription issued.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lock_finalized_prescriptions ON public.prescriptions;
CREATE TRIGGER trg_lock_finalized_prescriptions
  BEFORE UPDATE ON public.prescriptions
  FOR EACH ROW EXECUTE FUNCTION public.check_prescription_immutability();

CREATE OR REPLACE FUNCTION public.prevent_finalized_prescription_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'Finalized' THEN
    RAISE EXCEPTION 'Cannot hard delete a finalized prescription. Use soft delete (deleted_at) or cancellation.';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_finalized_prescription_delete ON public.prescriptions;
CREATE TRIGGER trg_prevent_finalized_prescription_delete
  BEFORE DELETE ON public.prescriptions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_finalized_prescription_delete();
