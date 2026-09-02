-- 0063_ai_subscriptions_hardening.sql
-- Hardens ai_subscriptions schema, adds missing financial & lifecycle columns,
-- and registers token top-up packs in ai_plans so financial transactions remain strictly relational.

-- 1. Add missing columns to ai_subscriptions
ALTER TABLE public.ai_subscriptions
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT false;

-- 2. Ensure Token Pack Plans exist in ai_plans so foreign key constraints on ai_transactions are satisfied
INSERT INTO public.ai_plans (id, product_id, name, description, billing_cycle, plan_type, included_monthly_credits, is_active, is_public)
VALUES
  ('pack_100', 'prod_patient_ai', '100 AI Tokens Pack', 'One-time top-up of 100 AI tokens', 'credit_pack', 'credit_pack', 100, true, true),
  ('pack_500', 'prod_patient_ai', '500 AI Tokens Pack', 'One-time top-up of 500 AI tokens', 'credit_pack', 'credit_pack', 500, true, true),
  ('pack_1000', 'prod_patient_ai', '1,000 AI Tokens Pack', 'One-time top-up of 1,000 AI tokens', 'credit_pack', 'credit_pack', 1000, true, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = true,
  updated_at = now();

-- 3. Regional prices for token packs (INR and USD)
INSERT INTO public.ai_regional_prices (plan_id, country_code, currency, base_amount, price_version, is_active)
VALUES
  ('pack_100', 'IN', 'INR', 199.00, 1, true),
  ('pack_100', 'US', 'USD', 5.00, 1, true),
  ('pack_500', 'IN', 'INR', 699.00, 1, true),
  ('pack_500', 'US', 'USD', 15.00, 1, true),
  ('pack_1000', 'IN', 'INR', 1199.00, 1, true),
  ('pack_1000', 'US', 'USD', 25.00, 1, true)
ON CONFLICT (plan_id, country_code, currency, price_version) DO UPDATE SET
  base_amount = EXCLUDED.base_amount,
  is_active = true,
  updated_at = now();
