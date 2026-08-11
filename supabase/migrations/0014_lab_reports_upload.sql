-- Turns lab_reports from a metadata-only, doctor-"ordered" placeholder into
-- a real patient-uploaded-file workflow (PDF/JPG/PNG from external labs),
-- plus a new lab_report_requests table for doctor-initiated "please upload
-- your CBC" requests. Mirrors the avatars bucket pattern from
-- 0010_avatar_storage.sql, except this bucket is PRIVATE (these are PHI
-- documents) — reads/writes only ever go through the backend's service-role
-- client (RecordsService), never a public URL or a browser-held anon key.
-- RLS below is defense-in-depth only, same convention as every other table
-- in this app.

alter table public.lab_reports
  add column if not exists file_path text,
  add column if not exists original_filename text,
  add column if not exists file_type text,
  add column if not exists report_date date,
  add column if not exists uploaded_by uuid references public.profiles(id),
  add column if not exists structured_data jsonb,
  add column if not exists reviewed_at timestamptz,
  add column if not exists notes text;

alter table public.lab_reports drop constraint if exists lab_reports_status_check;
alter table public.lab_reports add constraint lab_reports_status_check
  check (status in ('Uploaded', 'Reviewed'));
alter table public.lab_reports alter column status set default 'Uploaded';

-- ─────────────────────────────────────────────────────────────
-- lab_report_requests — doctor asks a patient to upload a specific report
-- ─────────────────────────────────────────────────────────────
create table public.lab_report_requests (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.profiles(id),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  requested_tests text not null,
  due_date date,
  notes text,
  status text not null default 'Pending' check (status in ('Pending', 'Fulfilled', 'Cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index lab_report_requests_patient_idx on public.lab_report_requests (patient_id);
create index lab_report_requests_doctor_idx on public.lab_report_requests (doctor_id);

create trigger lab_report_requests_set_updated_at
  before update on public.lab_report_requests
  for each row execute function public.set_updated_at();

alter table public.lab_reports
  add column if not exists request_id uuid references public.lab_report_requests(id);

alter table public.lab_report_requests enable row level security;

create policy "lab_report_requests_select_own" on public.lab_report_requests
  for select using (patient_id = auth.uid() or doctor_id = auth.uid() or public.current_app_role() = 'doctor');

create policy "lab_report_requests_write_doctor" on public.lab_report_requests
  for all using (public.current_app_role() = 'doctor') with check (public.current_app_role() = 'doctor');

-- lab_reports is now patient-uploaded, not just doctor-written — replace the
-- old doctor-only write policy with one that also allows a patient to
-- insert/update their own rows.
drop policy if exists "lab_reports_write_doctor" on public.lab_reports;

create policy "lab_reports_write_own" on public.lab_reports
  for all using (patient_id = auth.uid() or public.current_app_role() = 'doctor')
  with check (patient_id = auth.uid() or public.current_app_role() = 'doctor');

-- ─────────────────────────────────────────────────────────────
-- Storage bucket — private, backend-mediated only
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('lab-reports', 'lab-reports', false)
on conflict (id) do nothing;

-- Deliberately no permissive select/insert/update/delete policy for
-- anon/authenticated: every real access goes through RecordsService using
-- the service-role client, which bypasses RLS entirely. This leaves the
-- bucket deny-by-default for any client that somehow reaches it directly.
