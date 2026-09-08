-- ==========================================
-- MIGRATION: 0083_telemedicine_consultation_sessions.sql
-- ==========================================
-- Introduces authoritative consultation sessions and event tracking
-- Decouples ephemeral WebRTC signaling states from appointment bookings
-- Tracks doctor/patient presence, clinical drafts, and duration metrics

-- 1. Consultation Sessions Table
CREATE TABLE IF NOT EXISTS public.consultation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'waiting'
    CHECK (status IN (
      'waiting',
      'connecting',
      'connected',
      'temporarily_disconnected',
      'reconnecting',
      'call_dropped',
      'clinical_wrapup',
      'completed',
      'abandoned'
    )),
  doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  doctor_joined_at TIMESTAMPTZ,
  patient_joined_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  last_connected_at TIMESTAMPTZ,
  last_disconnected_at TIMESTAMPTZ,
  total_connected_seconds INTEGER NOT NULL DEFAULT 0,
  disconnection_count INTEGER NOT NULL DEFAULT 0,
  draft_notes JSONB DEFAULT NULL,
  media_mode TEXT NOT NULL DEFAULT 'video' CHECK (media_mode IN ('video', 'audio_only')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT consultation_sessions_appointment_unique UNIQUE (appointment_id)
);

CREATE INDEX IF NOT EXISTS consultation_sessions_doctor_idx ON public.consultation_sessions (doctor_id, status);
CREATE INDEX IF NOT EXISTS consultation_sessions_patient_idx ON public.consultation_sessions (patient_id, status);
CREATE INDEX IF NOT EXISTS consultation_sessions_appointment_idx ON public.consultation_sessions (appointment_id);

-- 2. Consultation Events Table (Immutable Audit Trail)
CREATE TABLE IF NOT EXISTS public.consultation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.consultation_sessions(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  triggered_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS consultation_events_appointment_idx ON public.consultation_events (appointment_id, created_at ASC);
CREATE INDEX IF NOT EXISTS consultation_events_session_idx ON public.consultation_events (session_id, created_at ASC);

-- 3. Enhance appointments table with authoritative timestamps if not exists
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS consultation_duration_seconds INTEGER DEFAULT 0;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.consultation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_events ENABLE ROW LEVEL SECURITY;

-- 5. Policies for consultation_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'consultation_sessions' AND policyname = 'Users can view their own consultation sessions'
  ) THEN
    CREATE POLICY "Users can view their own consultation sessions"
      ON public.consultation_sessions FOR SELECT
      USING (
        auth.uid() = doctor_id OR
        auth.uid() = patient_id OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'consultation_sessions' AND policyname = 'Doctors can update their assigned consultation sessions'
  ) THEN
    CREATE POLICY "Doctors can update their assigned consultation sessions"
      ON public.consultation_sessions FOR UPDATE
      USING (
        auth.uid() = doctor_id OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'consultation_sessions' AND policyname = 'Patients can update their joined state in consultation sessions'
  ) THEN
    CREATE POLICY "Patients can update their joined state in consultation sessions"
      ON public.consultation_sessions FOR UPDATE
      USING (auth.uid() = patient_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'consultation_events' AND policyname = 'Users can view events for their consultations'
  ) THEN
    CREATE POLICY "Users can view events for their consultations"
      ON public.consultation_events FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.appointments a
          WHERE a.id = consultation_events.appointment_id
            AND (a.doctor_id = auth.uid() OR a.patient_id = auth.uid())
        ) OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
      );
  END IF;
END $$;
