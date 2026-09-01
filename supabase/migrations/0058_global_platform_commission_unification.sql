-- 0058_global_platform_commission_unification.sql
-- Single Source of Truth for Global Platform Commission & Audit Trail

-- 1. Ensure platform_commission_rate exists on landing_settings (singleton id = 1)
ALTER TABLE public.landing_settings
  ADD COLUMN IF NOT EXISTS platform_commission_rate NUMERIC(5,2) NOT NULL DEFAULT 10;

UPDATE public.landing_settings
SET platform_commission_rate = 10
WHERE platform_commission_rate IS NULL;

-- 2. Create platform_commission_history audit table for tracking global rate modifications
CREATE TABLE IF NOT EXISTS public.platform_commission_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  previous_rate numeric(5,2),
  new_rate numeric(5,2) NOT NULL,
  effective_from timestamptz NOT NULL DEFAULT now(),
  changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  change_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS platform_commission_history_effective_idx 
  ON public.platform_commission_history (effective_from DESC);

-- 3. Ensure payments table has commission_rate snapshot column
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2);
