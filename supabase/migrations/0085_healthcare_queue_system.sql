-- ==========================================
-- MIGRATION: 0085_healthcare_queue_system.sql
-- ==========================================
-- Authoritative Healthcare Queue Management Schema
-- Decouples Scheduled Appointment from Live Queue State & Clinical Encounter

-- 1. Add queue operational columns to public.appointments
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS queue_token TEXT,
  ADD COLUMN IF NOT EXISTS queue_priority INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS called_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS estimated_wait_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS check_in_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (check_in_status IN ('pending', 'checked_in', 'late', 'no_show', 'exempt'));

-- 2. Add composite index for fast deterministic queue resolution
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_queue_order
  ON public.appointments (doctor_id, scheduled_date, status, queue_priority DESC)
  WHERE deleted_at IS NULL;

-- 3. Enhance consultation_events audit tracking
CREATE INDEX IF NOT EXISTS idx_consultation_events_queue
  ON public.consultation_events (appointment_id, event_type, created_at DESC);
