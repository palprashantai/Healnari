-- 0055_production_performance_indexes.sql
-- High-performance compound, partial, and foreign-key indexes for hot paths.

-- 1. Appointments Hot-Paths
-- Used in double-booking checks, slot availability, queue advancement, and doctor appointment queries
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date_time 
  ON public.appointments (doctor_id, scheduled_date, scheduled_time) 
  WHERE deleted_at IS NULL;

-- Used in patient appointment history, upcoming appointment widget, and patient dashboards
CREATE INDEX IF NOT EXISTS idx_appointments_patient_date 
  ON public.appointments (patient_id, scheduled_date DESC) 
  WHERE deleted_at IS NULL;

-- Used in cron jobs (overdue reminders, no-show markers, queue stats)
CREATE INDEX IF NOT EXISTS idx_appointments_status_date 
  ON public.appointments (status, scheduled_date) 
  WHERE deleted_at IS NULL;

-- 2. Notifications Hot-Paths
-- Used in fetchNotifications (pagination by user + desc created_at) and unread count badge
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created 
  ON public.notifications (user_id, read, created_at DESC);

-- 3. Daily Tracking & Patient Biomarker Logs
-- Used in cycle tracker history and analytics
CREATE INDEX IF NOT EXISTS idx_cycle_logs_patient_date 
  ON public.cycle_logs (patient_id, log_date DESC);

-- Used in daily habit tracking & streak calculations
CREATE INDEX IF NOT EXISTS idx_lifestyle_logs_patient_date 
  ON public.lifestyle_logs (patient_id, log_date DESC);

-- Used in vitals charts & trends
CREATE INDEX IF NOT EXISTS idx_vitals_logs_patient_date 
  ON public.vitals_logs (patient_id, logged_at DESC);

-- 4. Clinical & EMR Records
-- Used in prescription vaults and patient detail modals
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_created 
  ON public.prescriptions (patient_id, created_at DESC) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor_created 
  ON public.prescriptions (doctor_id, created_at DESC) 
  WHERE deleted_at IS NULL;

-- Used in lab report lists and vault
CREATE INDEX IF NOT EXISTS idx_lab_reports_patient_created 
  ON public.lab_reports (patient_id, created_at DESC) 
  WHERE deleted_at IS NULL;

-- Used in clinical notes timeline
CREATE INDEX IF NOT EXISTS idx_clinical_notes_patient_created 
  ON public.clinical_notes (patient_id, created_at DESC) 
  WHERE deleted_at IS NULL;

-- 5. Scheduling & Doctor Exceptions
-- Used in getAvailableSlots date-range checks
CREATE INDEX IF NOT EXISTS idx_doctor_schedules_doctor_dow 
  ON public.doctor_schedules (doctor_id, day_of_week);

CREATE INDEX IF NOT EXISTS idx_doctor_exceptions_doctor_date 
  ON public.doctor_exceptions (doctor_id, exception_date);

CREATE INDEX IF NOT EXISTS idx_leave_requests_doctor_dates 
  ON public.leave_requests (doctor_id, status, from_date, to_date);

-- 6. Family & Care Connections
CREATE INDEX IF NOT EXISTS idx_care_connections_patient_status 
  ON public.care_connections (patient_id, status);
