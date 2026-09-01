-- 0061_global_ai_monetization_multi_currency.sql
-- Global AI Multi-Country, Multi-Currency, Regional Pricing, Credit Ledger & Profitability Engine

-- 1. Countries Table
CREATE TABLE IF NOT EXISTS public.countries (
  code TEXT PRIMARY KEY,                       -- ISO 3166-1 alpha-2: 'IN', 'US', 'AE', 'GB', 'DE', 'CA', 'AU'
  name TEXT NOT NULL,
  region TEXT NOT NULL DEFAULT 'Global',       -- 'Asia', 'North America', 'Middle East', 'Europe', 'Oceania'
  default_currency TEXT NOT NULL DEFAULT 'USD',-- ISO 4217: 'INR', 'USD', 'AED', 'GBP', 'EUR'
  supported_currencies TEXT[] NOT NULL DEFAULT '{"USD"}'::text[],
  timezone TEXT NOT NULL DEFAULT 'UTC',
  locale TEXT NOT NULL DEFAULT 'en-US',
  phone_prefix TEXT NOT NULL DEFAULT '+1',
  tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  tax_name TEXT NOT NULL DEFAULT 'Standard Tax',-- 'GST', 'VAT', 'Sales Tax', 'MwSt'
  tax_type TEXT NOT NULL DEFAULT 'inclusive' CHECK (tax_type IN ('inclusive', 'exclusive')),
  payment_gateway TEXT NOT NULL DEFAULT 'stripe' CHECK (payment_gateway IN ('cashfree', 'stripe', 'razorpay', 'manual')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_ai_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Currencies Table
CREATE TABLE IF NOT EXISTS public.currencies (
  code TEXT PRIMARY KEY,                       -- ISO 4217: 'USD', 'INR', 'AED', 'EUR', 'GBP', 'CAD', 'AUD'
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  minor_decimals INTEGER NOT NULL DEFAULT 2,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_reporting_currency BOOLEAN NOT NULL DEFAULT false,
  usd_base_rate NUMERIC(12, 6) NOT NULL DEFAULT 1.0, -- 1 USD = X Currency (for normalized management reporting)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. AI Products Table
CREATE TABLE IF NOT EXISTS public.ai_products (
  id TEXT PRIMARY KEY,                         -- 'prod_patient_ai', 'prod_doctor_ai'
  name TEXT NOT NULL,
  description TEXT,
  target_role TEXT NOT NULL CHECK (target_role IN ('patient', 'doctor', 'all')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. AI Plans Table (Global Logical Identity)
CREATE TABLE IF NOT EXISTS public.ai_plans (
  id TEXT PRIMARY KEY,                         -- 'patient_free', 'patient_premium', 'doctor_free', 'doctor_pro', 'credit_pack_100'
  product_id TEXT NOT NULL REFERENCES public.ai_products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly', 'pay_per_use', 'credit_pack', 'lifetime')),
  plan_type TEXT NOT NULL DEFAULT 'subscription' CHECK (plan_type IN ('subscription', 'credit_pack', 'pay_per_use', 'add_on')),
  included_monthly_credits INTEGER NOT NULL DEFAULT 0,
  bonus_credits INTEGER NOT NULL DEFAULT 0,
  rollover_unused_credits BOOLEAN NOT NULL DEFAULT false,
  max_credit_cap INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_public BOOLEAN NOT NULL DEFAULT true,
  plan_version INTEGER NOT NULL DEFAULT 1,
  features TEXT[] NOT NULL DEFAULT '{}'::text[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. AI Regional Prices Table (Explicit Market-Specific Pricing & Versioning)
CREATE TABLE IF NOT EXISTS public.ai_regional_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id TEXT NOT NULL REFERENCES public.ai_plans(id) ON DELETE CASCADE,
  country_code TEXT NOT NULL REFERENCES public.countries(code) ON DELETE CASCADE,
  currency TEXT NOT NULL REFERENCES public.currencies(code) ON DELETE CASCADE,
  base_amount NUMERIC(10, 2) NOT NULL,        -- Explicit price: e.g. 299.00 INR, 9.99 USD, 19.00 AED
  price_version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_to TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_ai_regional_prices UNIQUE (plan_id, country_code, currency, price_version)
);

CREATE INDEX IF NOT EXISTS idx_ai_regional_prices_lookup ON public.ai_regional_prices (plan_id, country_code, currency, is_active);

-- 6. AI Feature Country Availability Matrix
CREATE TABLE IF NOT EXISTS public.ai_feature_country_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT NOT NULL REFERENCES public.ai_feature_flags(feature_key) ON DELETE CASCADE,
  country_code TEXT NOT NULL REFERENCES public.countries(code) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  beta_mode BOOLEAN NOT NULL DEFAULT false,
  credit_cost_override INTEGER,
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_ai_feature_country UNIQUE (feature_key, country_code)
);

CREATE INDEX IF NOT EXISTS idx_ai_feat_country_lookup ON public.ai_feature_country_availability (feature_key, country_code);

-- 7. AI Credit Accounts Table
CREATE TABLE IF NOT EXISTS public.ai_credit_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 5,
  lifetime_granted INTEGER NOT NULL DEFAULT 5,
  lifetime_consumed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_credit_accounts_user ON public.ai_credit_accounts (user_id);

-- 8. AI Credit Ledger (Immutable Auditable Double-Entry Log)
CREATE TABLE IF NOT EXISTS public.ai_credit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('GRANT', 'CONSUME', 'REFUND', 'BONUS', 'ADJUSTMENT', 'EXPIRATION')),
  amount INTEGER NOT NULL,                     -- Positive for added, negative for deducted
  balance_after INTEGER NOT NULL,
  feature TEXT,                                -- Feature key associated with consumption
  reference_id TEXT,                           -- Request ID, Transaction ID, or Subscription ID
  reason TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_credit_ledger_user_date ON public.ai_credit_ledger (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_credit_ledger_type ON public.ai_credit_ledger (entry_type);

-- 9. AI Model Costs Table (Versioned Provider Costs)
CREATE TABLE IF NOT EXISTS public.ai_model_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,                      -- 'gemini', 'openai', 'anthropic'
  model TEXT NOT NULL,                         -- 'gemini-1.5-flash', 'gemini-1.5-pro', 'gpt-4o-mini', 'text-embedding-004'
  input_cost_per_million NUMERIC(10, 6) NOT NULL,
  output_cost_per_million NUMERIC(10, 6) NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_to TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_ai_model_costs_model_ver UNIQUE (model, version)
);

CREATE INDEX IF NOT EXISTS idx_ai_model_costs_model ON public.ai_model_costs (model, is_active);

-- 10. AI Coupons Table
CREATE TABLE IF NOT EXISTS public.ai_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value NUMERIC(10, 2) NOT NULL,
  allowed_country TEXT REFERENCES public.countries(code) ON DELETE SET NULL, -- NULL = global
  allowed_currency TEXT REFERENCES public.currencies(code) ON DELETE SET NULL, -- Required if fixed_amount
  allowed_plan_ids TEXT[] DEFAULT '{}'::text[],
  max_uses INTEGER DEFAULT 1000,
  current_uses INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_coupons_code ON public.ai_coupons (code, is_active);

-- 11. AI Transactions Table (Immutable Financial Records)
CREATE TABLE IF NOT EXISTS public.ai_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES public.ai_plans(id),
  country_code TEXT NOT NULL REFERENCES public.countries(code),
  original_currency TEXT NOT NULL REFERENCES public.currencies(code),
  base_amount NUMERIC(10, 2) NOT NULL,
  tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  tax_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  final_amount NUMERIC(10, 2) NOT NULL,
  reporting_currency TEXT NOT NULL DEFAULT 'USD',
  reporting_amount NUMERIC(10, 2) NOT NULL,
  fx_rate_applied NUMERIC(12, 6) NOT NULL DEFAULT 1.0,
  gateway TEXT NOT NULL DEFAULT 'cashfree',
  gateway_txn_id TEXT,
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'failed', 'refunded')),
  refund_amount NUMERIC(10, 2) DEFAULT 0.00,
  coupon_code TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_transactions_user ON public.ai_transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_transactions_country_date ON public.ai_transactions (country_code, created_at DESC);

-- 12. AI Admin Audit Logs Table
CREATE TABLE IF NOT EXISTS public.ai_admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_name TEXT NOT NULL DEFAULT 'System Admin',
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_action ON public.ai_admin_audit_logs (action, created_at DESC);

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Currencies
INSERT INTO public.currencies (code, symbol, name, minor_decimals, is_active, is_reporting_currency, usd_base_rate) VALUES
  ('USD', '$', 'US Dollar', 2, true, true, 1.0),
  ('INR', '₹', 'Indian Rupee', 2, true, false, 84.60),
  ('AED', 'AED ', 'UAE Dirham', 2, true, false, 3.6725),
  ('EUR', '€', 'Euro', 2, true, false, 0.9216),
  ('GBP', '£', 'British Pound', 2, true, false, 0.7812),
  ('CAD', 'CA$', 'Canadian Dollar', 2, true, false, 1.3650),
  ('AUD', 'A$', 'Australian Dollar', 2, true, false, 1.5220)
ON CONFLICT (code) DO UPDATE SET
  symbol = EXCLUDED.symbol,
  usd_base_rate = EXCLUDED.usd_base_rate,
  updated_at = now();

-- Countries
INSERT INTO public.countries (code, name, region, default_currency, supported_currencies, timezone, locale, phone_prefix, tax_rate, tax_name, tax_type, payment_gateway, is_active, is_ai_enabled) VALUES
  ('IN', 'India', 'Asia', 'INR', '{"INR"}'::text[], 'Asia/Kolkata', 'en-IN', '+91', 18.00, 'GST', 'inclusive', 'cashfree', true, true),
  ('US', 'United States', 'North America', 'USD', '{"USD"}'::text[], 'America/New_York', 'en-US', '+1', 0.00, 'Sales Tax', 'exclusive', 'stripe', true, true),
  ('AE', 'United Arab Emirates', 'Middle East', 'AED', '{"AED","USD"}'::text[], 'Asia/Dubai', 'en-AE', '+971', 5.00, 'VAT', 'inclusive', 'stripe', true, true),
  ('GB', 'United Kingdom', 'Europe', 'GBP', '{"GBP","EUR"}'::text[], 'Europe/London', 'en-GB', '+44', 20.00, 'VAT', 'inclusive', 'stripe', true, true),
  ('DE', 'Germany', 'Europe', 'EUR', '{"EUR"}'::text[], 'Europe/Berlin', 'de-DE', '+49', 19.00, 'MwSt', 'inclusive', 'stripe', true, true),
  ('CA', 'Canada', 'North America', 'CAD', '{"CAD","USD"}'::text[], 'America/Toronto', 'en-CA', '+1', 13.00, 'HST/GST', 'exclusive', 'stripe', true, true),
  ('AU', 'Australia', 'Oceania', 'AUD', '{"AUD","USD"}'::text[], 'Australia/Sydney', 'en-AU', '+61', 10.00, 'GST', 'inclusive', 'stripe', true, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  default_currency = EXCLUDED.default_currency,
  tax_rate = EXCLUDED.tax_rate,
  tax_name = EXCLUDED.tax_name,
  payment_gateway = EXCLUDED.payment_gateway,
  updated_at = now();

-- AI Products
INSERT INTO public.ai_products (id, name, description, target_role, is_active) VALUES
  ('prod_patient_ai', 'HealNari Patient AI Suite', 'Comprehensive AI health companion, PCOS biomarker guide, lab decoder, and consult prep', 'patient', true),
  ('prod_doctor_ai', 'HealNari Doctor Clinical AI', 'Doctor intelligence with automated SOAP notes, Rx autocomplete, and drug interaction shield', 'doctor', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = now();

-- AI Plans (Global Logical Identities)
INSERT INTO public.ai_plans (id, product_id, name, description, billing_cycle, plan_type, included_monthly_credits, bonus_credits, is_active, is_public, plan_version, features) VALUES
  ('patient_free', 'prod_patient_ai', 'HealNari Free Companion', 'Free introductory cycle companion and basic wellness guide', 'monthly', 'subscription', 10, 0, true, true, 1, '{"PATIENT_CHAT"}'::text[]),
  ('patient_premium', 'prod_patient_ai', 'HealNari AI Premium', 'Unlimited cycle calibration, lab decoder, consult prep, and 500 AI credits/mo', 'monthly', 'subscription', 500, 50, true, true, 1, '{"PATIENT_CHAT","PATIENT_LAB_ANALYSIS","PATIENT_CONSULT_PREP"}'::text[]),
  ('patient_premium_yearly', 'prod_patient_ai', 'HealNari AI Premium Annual', 'Annual VIP subscription with 2 months free and 500 AI credits/mo', 'yearly', 'subscription', 500, 200, true, true, 1, '{"PATIENT_CHAT","PATIENT_LAB_ANALYSIS","PATIENT_CONSULT_PREP"}'::text[]),
  ('doctor_free', 'prod_doctor_ai', 'Doctor Standard', 'Basic prescription autocomplete and drug safety checks', 'monthly', 'subscription', 20, 0, true, true, 1, '{"DOCTOR_RX_AUTOCOMPLETE","DOCTOR_DRUG_SAFETY"}'::text[]),
  ('doctor_pro', 'prod_doctor_ai', 'Doctor AI Pro', 'Full pre-consult patient briefs, vector RAG SOAP notes, and 1,000 AI credits/mo', 'monthly', 'subscription', 1000, 100, true, true, 1, '{"DOCTOR_PATIENT_BRIEF","DOCTOR_SOAP_NOTES","DOCTOR_RX_AUTOCOMPLETE","DOCTOR_DRUG_SAFETY","DOCTOR_CONSULT_SUMMARY"}'::text[]),
  ('doctor_pro_yearly', 'prod_doctor_ai', 'Doctor AI Pro Annual', 'Annual clinical subscription with unlimited autocomplete and 1,000 AI credits/mo', 'yearly', 'subscription', 1000, 300, true, true, 1, '{"DOCTOR_PATIENT_BRIEF","DOCTOR_SOAP_NOTES","DOCTOR_RX_AUTOCOMPLETE","DOCTOR_DRUG_SAFETY","DOCTOR_CONSULT_SUMMARY"}'::text[])
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  included_monthly_credits = EXCLUDED.included_monthly_credits,
  features = EXCLUDED.features,
  updated_at = now();

-- Regional Prices (Explicit Stored Prices Per Market - Country != Currency)
INSERT INTO public.ai_regional_prices (plan_id, country_code, currency, base_amount, price_version, is_active) VALUES
  -- Patient Premium Monthly (Market-Positioned)
  ('patient_premium', 'IN', 'INR', 999.00, 1, true),
  ('patient_premium', 'US', 'USD', 35.00, 1, true),
  ('patient_premium', 'AE', 'AED', 129.00, 1, true),
  ('patient_premium', 'GB', 'GBP', 30.00, 1, true),
  ('patient_premium', 'DE', 'EUR', 35.00, 1, true),
  ('patient_premium', 'CA', 'CAD', 45.00, 1, true),
  ('patient_premium', 'AU', 'AUD', 49.00, 1, true),

  -- Patient Premium Yearly
  ('patient_premium_yearly', 'IN', 'INR', 9999.00, 1, true),
  ('patient_premium_yearly', 'US', 'USD', 349.00, 1, true),
  ('patient_premium_yearly', 'AE', 'AED', 1299.00, 1, true),
  ('patient_premium_yearly', 'GB', 'GBP', 299.00, 1, true),
  ('patient_premium_yearly', 'DE', 'EUR', 349.00, 1, true),
  ('patient_premium_yearly', 'CA', 'CAD', 449.00, 1, true),
  ('patient_premium_yearly', 'AU', 'AUD', 489.00, 1, true),

  -- Doctor Pro Monthly (Market-Positioned)
  ('doctor_pro', 'IN', 'INR', 1999.00, 1, true),
  ('doctor_pro', 'US', 'USD', 60.00, 1, true),
  ('doctor_pro', 'AE', 'AED', 220.00, 1, true),
  ('doctor_pro', 'GB', 'GBP', 50.00, 1, true),
  ('doctor_pro', 'DE', 'EUR', 60.00, 1, true),
  ('doctor_pro', 'CA', 'CAD', 79.00, 1, true),
  ('doctor_pro', 'AU', 'AUD', 89.00, 1, true),

  -- Doctor Pro Yearly
  ('doctor_pro_yearly', 'IN', 'INR', 19999.00, 1, true),
  ('doctor_pro_yearly', 'US', 'USD', 599.00, 1, true),
  ('doctor_pro_yearly', 'AE', 'AED', 2199.00, 1, true),
  ('doctor_pro_yearly', 'GB', 'GBP', 499.00, 1, true),
  ('doctor_pro_yearly', 'DE', 'EUR', 599.00, 1, true),
  ('doctor_pro_yearly', 'CA', 'CAD', 789.00, 1, true),
  ('doctor_pro_yearly', 'AU', 'AUD', 889.00, 1, true)
ON CONFLICT (plan_id, country_code, currency, price_version) DO UPDATE SET
  base_amount = EXCLUDED.base_amount,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- AI Model Costs (Infrastructure Token Economics)
INSERT INTO public.ai_model_costs (provider, model, input_cost_per_million, output_cost_per_million, version, is_active) VALUES
  ('gemini', 'gemini-1.5-flash', 0.075000, 0.300000, 1, true),
  ('gemini', 'gemini-1.5-pro', 1.250000, 5.000000, 1, true),
  ('openai', 'gpt-4o-mini', 0.150000, 0.600000, 1, true),
  ('openai', 'gpt-4o', 2.500000, 10.000000, 1, true),
  ('gemini', 'text-embedding-004', 0.025000, 0.000000, 1, true)
ON CONFLICT (model, version) DO UPDATE SET
  input_cost_per_million = EXCLUDED.input_cost_per_million,
  output_cost_per_million = EXCLUDED.output_cost_per_million,
  is_active = EXCLUDED.is_active;

-- Seed Sample Coupons
INSERT INTO public.ai_coupons (code, discount_type, discount_value, allowed_country, allowed_currency, max_uses, current_uses, is_active) VALUES
  ('HEALNARI20', 'percentage', 20.00, NULL, NULL, 500, 0, true),
  ('WELCOME100', 'fixed_amount', 100.00, 'IN', 'INR', 1000, 0, true),
  ('USAPROMO5', 'fixed_amount', 5.00, 'US', 'USD', 500, 0, true)
ON CONFLICT (code) DO NOTHING;
