-- Migration 0076: Prevent Double Booking
-- Replaces application-level checks with a strict database-level unique index.
-- This ensures a doctor cannot be booked twice for the same date and time unless the previous appointment was cancelled.

CREATE UNIQUE INDEX IF NOT EXISTS appointments_no_double_booking_idx 
ON public.appointments (doctor_id, scheduled_date, scheduled_time) 
WHERE status NOT IN ('Cancelled', 'No Show');
