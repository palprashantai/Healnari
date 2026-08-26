-- Migration 0052: Reschedule & Cancellation Tracking
-- Adds columns to track appointment rescheduling history and cancellation details.
-- Required by the new POST /appointments/:id/reschedule endpoint.

-- Reschedule tracking
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS rescheduled_from_date date,
  ADD COLUMN IF NOT EXISTS rescheduled_from_time text,
  ADD COLUMN IF NOT EXISTS rescheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS rescheduled_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS reschedule_reason text;

-- Cancellation tracking (who cancelled and why)
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

-- 24h reminder tracking (referenced by send24HourReminders cron but column
-- was never created — the cron silently finds zero rows because the IS NULL
-- check on a non-existent column returns no results)
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS reminder_24h_sent_at timestamptz;
