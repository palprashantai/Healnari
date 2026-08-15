-- Migration 0043: Cron automation columns & tables
-- Adds missing timestamp tracking columns and tables required by automated background sweeps
-- (PrescriptionsCronService, DoctorsCronService, BillingCronService, CyclePredictionCronService).

-- 1. Prescriptions Refill Reminders
alter table public.prescriptions
  add column if not exists refill_reminder_sent_at timestamptz;

create index if not exists prescriptions_refill_reminder_idx
  on public.prescriptions (refill_reminder_sent_at)
  where refill_reminder_sent_at is null;

-- 2. Appointments Follow-Up Reminders & Maintenance
alter table public.appointments
  add column if not exists follow_up_reminder_sent_at timestamptz,
  add column if not exists refund_processed_at timestamptz,
  add column if not exists payment_id uuid references public.payments(id) on delete set null,
  add column if not exists notes text;

create index if not exists appointments_follow_up_reminder_idx
  on public.appointments (follow_up_reminder_sent_at)
  where follow_up_reminder_sent_at is null;

-- 3. Lab Reports Pending Reminders
alter table public.lab_reports
  add column if not exists reminder_sent_at timestamptz;

create index if not exists lab_reports_reminder_sent_idx
  on public.lab_reports (reminder_sent_at)
  where reminder_sent_at is null;

-- 4. Patient Packages (Subscriptions & Care Plans)
create table if not exists public.patient_packages (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  package_name text not null,
  status text not null default 'active' check (status in ('active', 'expired', 'cancelled')),
  expires_at date not null,
  renewal_alert_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists patient_packages_patient_idx on public.patient_packages (patient_id);
create index if not exists patient_packages_status_expires_idx on public.patient_packages (status, expires_at);

alter table public.patient_packages enable row level security;

create policy "patient_packages_select_own" on public.patient_packages
  for select to authenticated using (patient_id = auth.uid() or public.current_app_role() in ('admin', 'doctor'));

create policy "patient_packages_admin_all" on public.patient_packages
  for all to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');

grant select, insert, update, delete on public.patient_packages to authenticated;

-- 5. Period Logs (Menstrual & Fertility Cycle Predictions)
create table if not exists public.period_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  start_date date not null,
  cycle_length int not null default 28,
  period_duration int not null default 5,
  is_tracking_fertility boolean not null default false,
  last_period_alert_date text,
  last_fertility_alert_date text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists period_logs_user_start_idx on public.period_logs (user_id, start_date desc);

alter table public.period_logs enable row level security;

create policy "period_logs_patient_own" on public.period_logs
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "period_logs_doctor_read" on public.period_logs
  for select to authenticated using (public.current_app_role() = 'doctor');

grant select, insert, update, delete on public.period_logs to authenticated;
