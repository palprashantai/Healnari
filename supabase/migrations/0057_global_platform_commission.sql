-- 0057_global_platform_commission.sql
-- Adds platform_commission_rate to landing_settings for central global control.

ALTER TABLE public.landing_settings
  ADD COLUMN IF NOT EXISTS platform_commission_rate NUMERIC(5,2) NOT NULL DEFAULT 10;

UPDATE public.landing_settings
SET platform_commission_rate = 10
WHERE platform_commission_rate IS NULL;
