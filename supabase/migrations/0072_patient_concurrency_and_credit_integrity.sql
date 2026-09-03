-- 0072_patient_concurrency_and_credit_integrity.sql
-- Production System Hardening:
-- 1. Prevent patient from concurrently booking multiple appointments at the exact same minute across doctors or tabs.
-- 2. Enforce non-negative credit balance constraint on AI credit accounts.
-- 3. Add compound index for fast payment-to-appointment reconciliation queries.

-- 1. Patient Double-Booking Prevention Index
CREATE UNIQUE INDEX IF NOT EXISTS appointments_patient_no_double_booking
  ON public.appointments (patient_id, scheduled_date, scheduled_time)
  WHERE status NOT IN ('Cancelled', 'No Show') AND deleted_at IS NULL;

-- 2. AI Credit Accounts Non-Negative Balance Constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_ai_credit_balance_non_negative'
  ) THEN
    ALTER TABLE public.ai_credit_accounts
      ADD CONSTRAINT check_ai_credit_balance_non_negative CHECK (balance >= 0);
  END IF;
END $$;

-- 3. Payments Hot-Path Compound Index (used in appointment reconciliation & booking settlement checks)
CREATE INDEX IF NOT EXISTS idx_payments_appointment_status
  ON public.payments (appointment_id, status);
