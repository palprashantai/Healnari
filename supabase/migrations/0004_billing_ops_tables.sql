-- Adds tables for the modules the frontend needed but the backend didn't have yet:
-- doctor payouts, telemedicine notes (reuses existing clinical_notes/appointments),
-- staff management, communications/broadcasts, and the patient records vault
-- (documents, vaccinations, emergency contacts).

-- ─────────────────────────────────────────────────────────────
-- payouts — doctor payout requests against their settled `payments` balance.
-- ─────────────────────────────────────────────────────────────
create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(10, 2) not null,
  method text not null default 'Bank Account' check (method in ('Bank Account', 'UPI', 'Wallet')),
  status text not null default 'Processing' check (status in ('Processing', 'Paid', 'Failed')),
  requested_at timestamptz not null default now(),
  processed_at timestamptz
);

create index payouts_doctor_idx on public.payouts (doctor_id);

-- ─────────────────────────────────────────────────────────────
-- staff_members — each doctor's own clinic roster.
-- ─────────────────────────────────────────────────────────────
create table public.staff_members (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  role text not null,
  shift text not null,
  phone text,
  status text not null default 'On Duty' check (status in ('On Duty', 'Off Duty')),
  joined_on date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index staff_members_doctor_idx on public.staff_members (doctor_id);

create trigger staff_members_set_updated_at
  before update on public.staff_members
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- leave_requests — leave against a staff_members row.
-- ─────────────────────────────────────────────────────────────
create table public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff_members(id) on delete cascade,
  doctor_id uuid not null references public.profiles(id) on delete cascade,
  leave_type text not null,
  from_date date not null,
  to_date date not null,
  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Rejected')),
  created_at timestamptz not null default now()
);

create index leave_requests_doctor_idx on public.leave_requests (doctor_id);

-- ─────────────────────────────────────────────────────────────
-- broadcasts — doctor-initiated messages to a patient audience.
-- ─────────────────────────────────────────────────────────────
create table public.broadcasts (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null,
  body text not null,
  audience text not null,
  channels text[] not null default '{}',
  status text not null default 'Sent' check (status in ('Sent', 'Scheduled')),
  scheduled_for timestamptz,
  created_at timestamptz not null default now()
);

create index broadcasts_doctor_idx on public.broadcasts (doctor_id);

-- ─────────────────────────────────────────────────────────────
-- patient_documents — metadata for the patient records vault.
-- (No binary storage wired up yet — file_url is a placeholder for a
-- future Supabase Storage upload; today the app only records metadata.)
-- ─────────────────────────────────────────────────────────────
create table public.patient_documents (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  uploaded_by uuid references public.profiles(id),
  file_name text not null,
  file_type text not null default 'pdf',
  size_bytes bigint not null default 0,
  lab_name text,
  file_url text,
  created_at timestamptz not null default now()
);

create index patient_documents_patient_idx on public.patient_documents (patient_id);

-- ─────────────────────────────────────────────────────────────
-- vaccinations
-- ─────────────────────────────────────────────────────────────
create table public.vaccinations (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  doses text,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create index vaccinations_patient_idx on public.vaccinations (patient_id);

-- ─────────────────────────────────────────────────────────────
-- emergency_contacts
-- ─────────────────────────────────────────────────────────────
create table public.emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  relation text not null,
  phone text not null,
  created_at timestamptz not null default now()
);

create index emergency_contacts_patient_idx on public.emergency_contacts (patient_id);

-- ══════════════════════════════════════════════════════════════
-- Row Level Security
-- ══════════════════════════════════════════════════════════════
alter table public.payouts enable row level security;
alter table public.staff_members enable row level security;
alter table public.leave_requests enable row level security;
alter table public.broadcasts enable row level security;
alter table public.patient_documents enable row level security;
alter table public.vaccinations enable row level security;
alter table public.emergency_contacts enable row level security;

-- ─── payouts — doctor owns their own requests ──────────────
create policy "payouts_doctor_own" on public.payouts
  for all using (doctor_id = auth.uid()) with check (doctor_id = auth.uid());

-- ─── staff_members — doctor owns their own roster ──────────
create policy "staff_members_doctor_own" on public.staff_members
  for all using (doctor_id = auth.uid()) with check (doctor_id = auth.uid());

-- ─── leave_requests — doctor owns their own roster's leave ─
create policy "leave_requests_doctor_own" on public.leave_requests
  for all using (doctor_id = auth.uid()) with check (doctor_id = auth.uid());

-- ─── broadcasts — doctor owns their own sends ──────────────
create policy "broadcasts_doctor_own" on public.broadcasts
  for all using (doctor_id = auth.uid()) with check (doctor_id = auth.uid());

-- ─── patient_documents — patient owns; doctors can read/write (single-clinic) ─
create policy "patient_documents_select_own" on public.patient_documents
  for select using (patient_id = auth.uid() or public.current_app_role() = 'doctor');

create policy "patient_documents_write_own" on public.patient_documents
  for insert with check (patient_id = auth.uid() or public.current_app_role() = 'doctor');

create policy "patient_documents_delete_own" on public.patient_documents
  for delete using (patient_id = auth.uid() or public.current_app_role() = 'doctor');

-- ─── vaccinations ───────────────────────────────────────────
create policy "vaccinations_select_own" on public.vaccinations
  for select using (patient_id = auth.uid() or public.current_app_role() = 'doctor');

create policy "vaccinations_write_own" on public.vaccinations
  for all using (patient_id = auth.uid() or public.current_app_role() = 'doctor')
  with check (patient_id = auth.uid() or public.current_app_role() = 'doctor');

-- ─── emergency_contacts ─────────────────────────────────────
create policy "emergency_contacts_select_own" on public.emergency_contacts
  for select using (patient_id = auth.uid() or public.current_app_role() = 'doctor');

create policy "emergency_contacts_write_own" on public.emergency_contacts
  for all using (patient_id = auth.uid() or public.current_app_role() = 'doctor')
  with check (patient_id = auth.uid() or public.current_app_role() = 'doctor');

-- ══════════════════════════════════════════════════════════════
-- Grants
-- ══════════════════════════════════════════════════════════════
grant select, insert, update, delete on
  public.payouts,
  public.staff_members,
  public.leave_requests,
  public.broadcasts,
  public.patient_documents,
  public.vaccinations,
  public.emergency_contacts
to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Lab review workflow — the review fields already exist on lab_reports
-- (interpretation, doctor_action, status) from 0001_init.sql; this
-- migration only adds the tables above. See RecordsController for the
-- new PUT /api/records/lab-reports/:id/review route that writes them.
-- ─────────────────────────────────────────────────────────────
