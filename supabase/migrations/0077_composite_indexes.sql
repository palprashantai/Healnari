-- Migration 0077: Performance Indexes
-- Adds composite indexes to support dashboard queries and clinical timeline loading.

CREATE INDEX IF NOT EXISTS appointments_dashboard_idx 
ON public.appointments (doctor_id, scheduled_date, status);

CREATE INDEX IF NOT EXISTS clinical_notes_history_idx 
ON public.clinical_notes (patient_id, created_at DESC);
