-- Migration: 0084_clinical_prescription_enhancements
-- Purpose: Adds structured clinical fields, versioning, digital signature tracking, and amendment capabilities to prescriptions.

-- 1. Extend prescriptions status check constraint to include Amended and Superseded
ALTER TABLE public.prescriptions DROP CONSTRAINT IF EXISTS prescriptions_status_check;
ALTER TABLE public.prescriptions ADD CONSTRAINT prescriptions_status_check 
  CHECK (status IN ('Draft', 'Finalized', 'Cancelled', 'Active', 'Expired', 'Amended', 'Superseded'));

-- 2. Add structured clinical medication columns
ALTER TABLE public.prescriptions
  ADD COLUMN IF NOT EXISTS dosage_form text,
  ADD COLUMN IF NOT EXISTS route text DEFAULT 'Oral',
  ADD COLUMN IF NOT EXISTS food_relation text,
  ADD COLUMN IF NOT EXISTS indication text,
  ADD COLUMN IF NOT EXISTS is_sos boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS quantity text,
  ADD COLUMN IF NOT EXISTS refills_authorized int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS version int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS amended_from_id uuid REFERENCES public.prescriptions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS amendment_reason text,
  ADD COLUMN IF NOT EXISTS signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS signature_hash text;

-- 3. Indexes for versioning and amendments
CREATE INDEX IF NOT EXISTS prescriptions_version_idx ON public.prescriptions(group_id, version);
CREATE INDEX IF NOT EXISTS prescriptions_amended_from_idx ON public.prescriptions(amended_from_id);

-- 4. Update Immutability Trigger to allow transition from Finalized to Superseded or Amended
CREATE OR REPLACE FUNCTION public.check_prescription_immutability()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'Finalized' THEN
    -- Allow transition to Cancelled or Superseded (when amended)
    IF NEW.status NOT IN ('Finalized', 'Cancelled', 'Superseded', 'Amended') THEN
      RAISE EXCEPTION 'Cannot change status of a finalized prescription to %', NEW.status;
    END IF;
    -- Disallow modifying clinical payload once Finalized unless marking as Superseded/Amended
    IF NEW.status = OLD.status AND (
         NEW.med_name IS DISTINCT FROM OLD.med_name OR
         NEW.dosage IS DISTINCT FROM OLD.dosage OR
         NEW.schedule IS DISTINCT FROM OLD.schedule OR
         NEW.duration IS DISTINCT FROM OLD.duration OR
         NEW.instructions IS DISTINCT FROM OLD.instructions OR
         NEW.dosage_form IS DISTINCT FROM OLD.dosage_form OR
         NEW.food_relation IS DISTINCT FROM OLD.food_relation OR
         NEW.patient_id IS DISTINCT FROM OLD.patient_id OR
         NEW.doctor_id IS DISTINCT FROM OLD.doctor_id
       ) THEN
      RAISE EXCEPTION 'Cannot modify clinical content of a finalized prescription. Create a new version/amendment instead.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
