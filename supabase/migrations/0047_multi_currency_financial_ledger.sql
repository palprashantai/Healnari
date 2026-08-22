-- 0047_multi_currency_financial_ledger.sql
-- Production-grade multi-currency financial ledger columns, FX tracking, and revenue reconciliation RPCs

-- 1. Extend payments table with immutable original currency and reporting conversion columns
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS original_amount numeric(12, 2);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS original_currency text DEFAULT 'INR';

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS reporting_amount numeric(12, 2);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS reporting_currency text DEFAULT 'USD';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS fx_rate numeric(14, 6) DEFAULT 1.0;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS fx_rate_source text DEFAULT 'configured_matrix';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS fx_rate_timestamp timestamptz DEFAULT now();

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS platform_fee_amount numeric(12, 2) DEFAULT 0.00;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS platform_fee_currency text DEFAULT 'INR';

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS provider_payout_amount numeric(12, 2) DEFAULT 0.00;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS provider_payout_currency text DEFAULT 'INR';

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS refund_amount numeric(12, 2) DEFAULT 0.00;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS refund_currency text DEFAULT 'INR';

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS tax_amount numeric(12, 2) DEFAULT 0.00;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS tax_currency text DEFAULT 'INR';

-- Backfill original_amount and original_currency for existing payment records if null
UPDATE public.payments
SET 
  original_amount = COALESCE(original_amount, amount),
  original_currency = COALESCE(original_currency, currency, 'INR'),
  platform_fee_amount = COALESCE(platform_fee_amount, ROUND(amount * 0.10, 2)),
  platform_fee_currency = COALESCE(platform_fee_currency, currency, 'INR'),
  provider_payout_amount = COALESCE(provider_payout_amount, ROUND(amount * 0.90, 2)),
  provider_payout_currency = COALESCE(provider_payout_currency, currency, 'INR'),
  reporting_currency = COALESCE(reporting_currency, 'USD')
WHERE original_amount IS NULL;

-- 2. Extend payouts table
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS original_amount numeric(12, 2);
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS original_currency text DEFAULT 'INR';
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS reference_id text;

UPDATE public.payouts
SET 
  original_amount = COALESCE(original_amount, amount),
  original_currency = COALESCE(original_currency, currency, 'INR')
WHERE original_amount IS NULL;

-- 3. Extend refund_requests table
ALTER TABLE public.refund_requests ADD COLUMN IF NOT EXISTS refund_currency text DEFAULT 'INR';
ALTER TABLE public.refund_requests ADD COLUMN IF NOT EXISTS reporting_refund_amount numeric(12, 2);
ALTER TABLE public.refund_requests ADD COLUMN IF NOT EXISTS reporting_currency text DEFAULT 'USD';
ALTER TABLE public.refund_requests ADD COLUMN IF NOT EXISTS fx_rate numeric(14, 6) DEFAULT 1.0;

-- 4. Multi-currency performance indexes
CREATE INDEX IF NOT EXISTS idx_payments_status_currency ON public.payments (status, original_currency);
CREATE INDEX IF NOT EXISTS idx_payments_created_at_status ON public.payments (created_at, status);
CREATE INDEX IF NOT EXISTS idx_payments_doctor_status ON public.payments (doctor_id, status);
CREATE INDEX IF NOT EXISTS idx_payouts_doctor_status ON public.payouts (doctor_id, status);

-- 5. Updated multi-currency dashboard revenue aggregator RPC
CREATE OR REPLACE FUNCTION get_dashboard_revenue_multi_currency(p_target_currency text DEFAULT 'USD')
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_revenue numeric := 0;
BEGIN
  -- Sum up reporting_amount where available, or convert using default matrix
  SELECT COALESCE(SUM(
    CASE 
      WHEN p.status = 'Paid' AND p.reporting_amount IS NOT NULL AND p.reporting_currency = p_target_currency THEN p.reporting_amount
      WHEN p.status = 'Paid' AND p.currency = 'USD' AND p_target_currency = 'USD' THEN p.amount
      WHEN p.status = 'Paid' AND p.currency = 'INR' AND p_target_currency = 'USD' THEN ROUND(p.amount * 0.01182, 2)
      WHEN p.status = 'Paid' AND p.currency = 'AED' AND p_target_currency = 'USD' THEN ROUND(p.amount * 0.2723, 2)
      WHEN p.status = 'Paid' AND p.currency = 'EUR' AND p_target_currency = 'USD' THEN ROUND(p.amount * 1.085, 2)
      WHEN p.status = 'Paid' AND p.currency = 'GBP' AND p_target_currency = 'USD' THEN ROUND(p.amount * 1.28, 2)
      WHEN p.status = 'Paid' AND p.currency = p_target_currency THEN p.amount
      ELSE p.amount
    END
  ), 0) INTO v_total_revenue
  FROM payments p
  WHERE p.status = 'Paid';
  
  RETURN v_total_revenue;
END;
$$;
