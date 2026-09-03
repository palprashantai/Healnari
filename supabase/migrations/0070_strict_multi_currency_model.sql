-- 0070_strict_multi_currency_model.sql
-- Enforces 4-part money model (Base Price vs Paid Amount) with FX metadata
-- across payouts, refund_requests, invoices, and ai_transactions.

-- ==========================================
-- 1. PAYOUTS
-- ==========================================
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS original_amount numeric(12, 2);
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS original_currency text DEFAULT 'INR';
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS source_amount numeric(12, 2);
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS source_currency text DEFAULT 'INR';
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS payout_amount numeric(12, 2);
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS payout_currency text DEFAULT 'INR';
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS exchange_rate numeric(14, 6) DEFAULT 1.0;
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS exchange_rate_source text DEFAULT 'healnari_treasury_matrix_v1';
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS exchange_rate_timestamp timestamptz DEFAULT now();

-- Backfill payouts safely
UPDATE public.payouts
SET
  source_amount = COALESCE(source_amount, original_amount, amount),
  source_currency = COALESCE(source_currency, original_currency, currency, 'INR'),
  payout_amount = COALESCE(payout_amount, amount),
  payout_currency = COALESCE(payout_currency, currency, 'INR')
WHERE source_amount IS NULL;

-- ==========================================
-- 2. REFUND REQUESTS
-- ==========================================
ALTER TABLE public.refund_requests ADD COLUMN IF NOT EXISTS original_paid_amount numeric(12, 2);
ALTER TABLE public.refund_requests ADD COLUMN IF NOT EXISTS original_paid_currency text DEFAULT 'INR';
ALTER TABLE public.refund_requests ADD COLUMN IF NOT EXISTS refund_amount numeric(12, 2);
ALTER TABLE public.refund_requests ADD COLUMN IF NOT EXISTS refund_currency text DEFAULT 'INR';

-- Backfill refund_requests safely
UPDATE public.refund_requests
SET
  original_paid_amount = COALESCE(original_paid_amount, amount),
  original_paid_currency = COALESCE(original_paid_currency, currency, 'INR'),
  refund_amount = COALESCE(refund_amount, amount),
  refund_currency = COALESCE(refund_currency, currency, 'INR')
WHERE original_paid_amount IS NULL;

-- ==========================================
-- 3. AI TRANSACTIONS
-- ==========================================
-- AI Transactions table in 0061 already has:
-- original_currency, base_amount, final_amount, reporting_currency, reporting_amount, fx_rate_applied
-- Let's standardize it to base/paid model
ALTER TABLE public.ai_transactions ADD COLUMN IF NOT EXISTS base_currency text DEFAULT 'INR';
ALTER TABLE public.ai_transactions ADD COLUMN IF NOT EXISTS paid_amount numeric(12, 2);
ALTER TABLE public.ai_transactions ADD COLUMN IF NOT EXISTS paid_currency text DEFAULT 'INR';
ALTER TABLE public.ai_transactions ADD COLUMN IF NOT EXISTS exchange_rate numeric(14, 6) DEFAULT 1.0;
ALTER TABLE public.ai_transactions ADD COLUMN IF NOT EXISTS exchange_rate_source text DEFAULT 'healnari_treasury_matrix_v1';
ALTER TABLE public.ai_transactions ADD COLUMN IF NOT EXISTS exchange_rate_timestamp timestamptz DEFAULT now();

-- Backfill ai_transactions safely
UPDATE public.ai_transactions
SET
  base_currency = COALESCE(base_currency, original_currency, 'INR'),
  paid_amount = COALESCE(paid_amount, final_amount),
  paid_currency = COALESCE(paid_currency, original_currency, 'INR'),
  exchange_rate = COALESCE(exchange_rate, fx_rate_applied, 1.0)
WHERE paid_amount IS NULL;

-- ==========================================
-- 4. INVOICES
-- ==========================================
-- If invoices table exists, apply to invoices dynamically using EXECUTE
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') THEN
        EXECUTE 'ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS base_amount numeric(12, 2)';
        EXECUTE 'ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS base_currency text DEFAULT ''INR''';
        EXECUTE 'ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS paid_amount numeric(12, 2)';
        EXECUTE 'ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS paid_currency text DEFAULT ''INR''';
        EXECUTE 'ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS exchange_rate numeric(14, 6) DEFAULT 1.0';
        EXECUTE 'ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS exchange_rate_source text DEFAULT ''healnari_treasury_matrix_v1''';
        EXECUTE 'ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS exchange_rate_timestamp timestamptz DEFAULT now()';

        EXECUTE 'UPDATE public.invoices
        SET
          base_amount = COALESCE(base_amount, amount),
          base_currency = COALESCE(base_currency, currency, ''INR''),
          paid_amount = COALESCE(paid_amount, amount),
          paid_currency = COALESCE(paid_currency, currency, ''INR'')
        WHERE base_amount IS NULL';
    END IF;
END $$;
