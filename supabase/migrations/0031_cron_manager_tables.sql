-- ============================================================================
-- Migration 0031: Cron Manager Configurations & Execution Audit Logs
-- ============================================================================
-- Persists dynamic background cron automation schedules, running/pause states,
-- and records execution audit history with durations and error logs.
-- ============================================================================

-- 1. Cron Configurations Table
create table if not exists public.cron_configurations (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  display_name text not null,
  category text not null,
  expression text not null,
  is_running boolean not null default true,
  last_run_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists cron_configurations_name_idx on public.cron_configurations (name);
create index if not exists cron_configurations_category_idx on public.cron_configurations (category);

alter table public.cron_configurations enable row level security;

create policy "cron_configurations_select_admin" on public.cron_configurations
  for select to authenticated using (current_app_role() = 'admin');

create policy "cron_configurations_insert_admin" on public.cron_configurations
  for insert to authenticated with check (current_app_role() = 'admin');

create policy "cron_configurations_update_admin" on public.cron_configurations
  for update to authenticated using (current_app_role() = 'admin');

-- Seed initial catalog configurations
insert into public.cron_configurations (name, display_name, category, expression, is_running)
values
  ('appointments_reminder_30min', '30-Min Call Pre-Flight Reminder', 'Appointments', '*/5 * * * *', true),
  ('appointments_queue_delay', 'Live Queue Delay Projection', 'Appointments', '*/5 * * * *', true),
  ('appointments_unpaid_release', 'Unpaid Slot Timeout Release', 'Appointments', '*/5 * * * *', true),
  ('prescription_refill_reminders', 'Prescription Refill Expiry Warning', 'Patient', '0 9 * * *', true),
  ('prescription_follow_up_reminders', 'Doctor Recommended Follow-Up Chaser', 'Patient', '0 10 * * *', true),
  ('prescription_pending_lab_reminders', 'Pending Lab Report Chaser', 'Patient', '0 11 * * *', true),
  ('cycle_period_prediction', 'Period Approaching 2-Day Alert', 'Patient', '0 7 * * *', true),
  ('cycle_fertile_window', 'Fertile Window & Ovulation Notice', 'Patient', '0 30 7 * * *', true),
  ('doctor_daily_agenda', 'Doctor Morning Agenda Digest', 'Doctor', '0 45 7 * * *', true),
  ('doctor_stale_consultation_archival', 'Nightly Queue Archival', 'Doctor', '0 2 * * *', true),
  ('admin_daily_revenue_reconciliation', 'Daily Financial Settlement Reconciliation', 'Admin', '0 0 * * *', true),
  ('admin_doctor_kyc_escalation', 'Doctor KYC Review Escalation', 'Admin', '0 0 12 * * 1', true),
  ('billing_automated_refunds', 'Automated Cancellation Refunds', 'Billing', '0 */15 * * * *', true),
  ('billing_care_plan_renewals', 'Care Plan Renewal Reminders', 'Billing', '0 9 * * *', true)
on conflict (name) do nothing;


-- 2. Cron Execution Logs Table (Audit History)
create table if not exists public.cron_execution_logs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  status text not null check (status in ('SUCCESS', 'FAILED')),
  triggered_by text not null default 'SCHEDULE' check (triggered_by in ('SCHEDULE', 'MANUAL_ADMIN')),
  duration_ms integer not null default 0,
  items_processed integer not null default 0,
  details jsonb default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists cron_execution_logs_job_idx on public.cron_execution_logs (job_name, created_at desc);
create index if not exists cron_execution_logs_created_idx on public.cron_execution_logs (created_at desc);

alter table public.cron_execution_logs enable row level security;

create policy "cron_execution_logs_select_admin" on public.cron_execution_logs
  for select to authenticated using (current_app_role() = 'admin');

create policy "cron_execution_logs_insert_admin" on public.cron_execution_logs
  for insert to authenticated with check (current_app_role() = 'admin');
