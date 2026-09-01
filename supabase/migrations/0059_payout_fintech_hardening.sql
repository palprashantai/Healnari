-- 0059_payout_fintech_hardening.sql
-- Production Fintech-Grade Payout Schema Enhancements:
-- 1. Idempotency key for preventing duplicate payout submissions.
-- 2. Destination snapshot (Bank/UPI details) immutable at request time.
-- 3. Failure reason and audit metadata for disbursement tracking.

ALTER TABLE public.payouts
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS destination_details JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS failure_reason TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create index for quick lookup of doctor payouts by idempotency key and status
CREATE INDEX IF NOT EXISTS idx_payouts_idempotency ON public.payouts (idempotency_key);
CREATE INDEX IF NOT EXISTS idx_payouts_doctor_requested ON public.payouts (doctor_id, requested_at DESC);
