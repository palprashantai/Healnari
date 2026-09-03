-- 0071_payments_disputed_status.sql
-- Expand payments_status_check constraint to support 'Disputed' status when gateway discrepancies are flagged.

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;

ALTER TABLE public.payments ADD CONSTRAINT payments_status_check
  CHECK (status IN ('Paid', 'Pending', 'Insurance Claimed', 'Refunded', 'Failed', 'Refund Pending', 'Disputed'));
