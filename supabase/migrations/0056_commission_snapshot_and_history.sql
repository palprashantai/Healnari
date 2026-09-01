-- 0056_commission_snapshot_and_history.sql
-- Centralizes doctor-wise platform commission with immutable snapshots
-- and auditable change history.

-- 1. Snapshot the applied commission rate on each payment record
--    so historical transactions are never recalculated when the
--    doctor's rate changes.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS commission_rate numeric(5,2);

-- Backfill: reverse-compute the rate from stored amounts for existing
-- payment records. Where platform_fee_amount was backfilled by 0047 as
-- 10%, this will reconstruct as 10. Where billing.service calculated
-- correctly from doctor.commission_rate, the real rate is preserved.
UPDATE public.payments
SET commission_rate = CASE
  WHEN amount > 0 AND platform_fee_amount IS NOT NULL AND platform_fee_amount > 0
    THEN ROUND((platform_fee_amount::numeric / amount::numeric) * 100, 2)
  ELSE 15  -- DB column default from 0016
END
WHERE commission_rate IS NULL;

-- 2. Commission change history table — every rate change is preserved
--    with who changed it and when, enabling full financial audit.
CREATE TABLE IF NOT EXISTS public.doctor_commission_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  commission_rate numeric(5,2) NOT NULL,
  previous_rate numeric(5,2),
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_to timestamptz,
  status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Superseded')),
  changed_by uuid REFERENCES public.profiles(id),
  change_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commission_history_doctor
  ON public.doctor_commission_history(doctor_id, effective_from DESC);

CREATE INDEX IF NOT EXISTS idx_commission_history_active
  ON public.doctor_commission_history(doctor_id, status)
  WHERE status = 'Active';

-- 3. Seed baseline history rows for every doctor with their current
--    commission_rate so the history table isn't empty on day 1.
INSERT INTO public.doctor_commission_history (doctor_id, commission_rate, effective_from, status, change_reason)
SELECT id, commission_rate, COALESCE(created_at, now()), 'Active', 'Baseline — initial rate at migration time'
FROM public.profiles
WHERE role = 'doctor'
  AND NOT EXISTS (
    SELECT 1 FROM public.doctor_commission_history h WHERE h.doctor_id = profiles.id
  );

-- 4. Performance index for payment queries that reference commission_rate
CREATE INDEX IF NOT EXISTS idx_payments_commission_rate
  ON public.payments(doctor_id, commission_rate)
  WHERE commission_rate IS NOT NULL;
