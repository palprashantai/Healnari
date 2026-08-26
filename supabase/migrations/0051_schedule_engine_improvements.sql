-- Migration 0051: Schedule Engine Improvements
-- Fixes critical bug: doctor_exceptions.reason column referenced in code but missing from schema.
-- Adds configurable slot duration, buffer time, booking window, and prevents duplicate exceptions.

-- 1. CRITICAL FIX: Add reason column to doctor_exceptions
--    DoctorsService.addException() inserts a `reason` field that doesn't exist.
ALTER TABLE public.doctor_exceptions ADD COLUMN IF NOT EXISTS reason text;

-- 2. Prevent duplicate exceptions for the same doctor/date
CREATE UNIQUE INDEX IF NOT EXISTS doctor_exceptions_unique_date
  ON public.doctor_exceptions (doctor_id, exception_date);

-- 3. Configurable slot duration per day (currently hardcoded to 30 everywhere)
ALTER TABLE public.doctor_schedules
  ADD COLUMN IF NOT EXISTS slot_duration_minutes int NOT NULL DEFAULT 30;

-- 4. Buffer time between consecutive appointments
ALTER TABLE public.doctor_schedules
  ADD COLUMN IF NOT EXISTS buffer_minutes int NOT NULL DEFAULT 0;

-- 5. Booking window constraints on doctor profiles
--    min_advance_booking_minutes: patient cannot book less than N minutes before
--    max_advance_booking_days: patient can book only up to N days in advance
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS min_advance_booking_minutes int NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS max_advance_booking_days int NOT NULL DEFAULT 60;
