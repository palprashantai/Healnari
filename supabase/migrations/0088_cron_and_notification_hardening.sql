-- ============================================================================
-- Migration 0088: Cron Reliability, Notification Hardening & Postgres Advisory Locks
-- ============================================================================

-- 1. Decouple cancellation reason from clinical notes
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- 2. Clean up any existing duplicate notifications before enforcing UNIQUE constraint
DELETE FROM public.notifications n1
USING public.notifications n2
WHERE n1.id > n2.id
  AND n1.user_id = n2.user_id
  AND n1.idempotency_key = n2.idempotency_key
  AND n1.idempotency_key IS NOT NULL;

-- 3. Enforce UNIQUE idempotency constraint on (user_id, idempotency_key)
CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_user_idempotency
  ON public.notifications (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- 4. Native Postgres Advisory Locks for Distributed Cluster / Multi-Instance Coordination
-- Non-blocking try-lock: returns TRUE if acquired, FALSE if already held by another node
CREATE OR REPLACE FUNCTION public.try_advisory_lock(key bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN pg_try_advisory_lock(key);
END;
$$;

-- Release lock: returns TRUE if unlocked, FALSE if not held
CREATE OR REPLACE FUNCTION public.release_advisory_lock(key bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN pg_advisory_unlock(key);
END;
$$;

-- 5. Persistent Crash-Resilient Email Queue Fields on email_logs
ALTER TABLE public.email_logs
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS retry_attempts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payload JSONB;

CREATE INDEX IF NOT EXISTS idx_email_logs_retry_sweep
  ON public.email_logs (status, next_retry_at)
  WHERE status = 'PENDING_RETRY';

-- 6. Insert remaining active cron jobs into cron_configurations catalog if missing
INSERT INTO public.cron_configurations (name, display_name, category, expression, is_running)
VALUES
  ('appointments_reminder_24h', '24-Hour Call Reminder', 'Appointments', '0 * * * *', true),
  ('appointments_no_show_processor', 'No-Show Consultation Sweep', 'Appointments', '0,30 * * * *', true),
  ('appointments_unpaid_cancellation_sweep', 'Unpaid Approved Consult Expiry Sweep', 'Appointments', '0,30 * * * *', true),
  ('lifestyle_daily_habit_reminder', 'Daily Habit & Nutrition Logging Prompt', 'Patient', '0 8 * * *', true),
  ('ai_subscription_expiry_sweep', 'AI Subscription Expiration & Renewal Sweep', 'Billing', '0 0 * * *', true),
  ('handleMonthlyCreditReset', 'Monthly AI Credit Allocation Reset', 'Billing', '0 0 1 * *', true)
ON CONFLICT (name) DO NOTHING;
