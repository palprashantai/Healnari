-- HEALNARI MASTER SETUP SCRIPT
-- Auto-generated to combine all migrations and seed data into one run.



-- ==========================================
-- MIGRATION: 0001_init.sql
-- ==========================================

-- HealNari core schema — doctor + patient portals.
-- Run in the Supabase SQL editor, or via `supabase db push` after `supabase link`.
-- Requires: Email auth enabled on the project (Authentication → Providers).

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────
-- Helper: keep an updated_at column current on every UPDATE
-- ─────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- profiles — one row per auth.users row, role-tagged.
-- Doctor-only fields are simply left null on patient rows.
-- ─────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('doctor', 'patient')),
  full_name text not null,
  phone text,
  avatar_url text,
  specialty text,
  registration_no text,
  kyc_verified boolean not null default false,
  kyc_submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Reads a caller's own app role without recursing back through profiles'
-- own RLS policies. SECURITY DEFINER functions owned by the migration role
-- (postgres) bypass RLS on the tables they query — this is the standard
-- Supabase pattern for role checks used inside policies. Named
-- current_app_role (not current_role) to avoid colliding with the
-- SQL-standard CURRENT_ROLE construct.
create or replace function public.current_app_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Auto-create a profile (and, for patients, a patient_records row) on signup.
-- Expects: supabase.auth.signUp({ options: { data: { role, full_name, specialty? } } })
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role text := coalesce(new.raw_user_meta_data->>'role', 'patient');
begin
  insert into public.profiles (id, role, full_name, specialty)
  values (
    new.id,
    v_role,
    coalesce(new.raw_user_meta_data->>'full_name', 'New User'),
    new.raw_user_meta_data->>'specialty'
  );

  if v_role = 'patient' then
    insert into public.patient_records (patient_id, mrn)
    values (new.id, 'HN-' || (100000 + floor(random() * 900000))::int);
  end if;

  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- patient_records — the ONE canonical clinical identity record per
-- patient (MRN, DOB, allergies, blood group). Every screen in both
-- portals should read this instead of keeping its own copy.
-- ─────────────────────────────────────────────────────────────
create table public.patient_records (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null unique references public.profiles(id) on delete cascade,
  mrn text not null unique,
  dob date,
  blood_group text,
  allergies text[] not null default '{}',
  chronic_conditions text[] not null default '{}',
  height_cm numeric,
  weight_kg numeric,
  primary_doctor_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger patient_records_set_updated_at
  before update on public.patient_records
  for each row execute function public.set_updated_at();

-- handle_new_user() above references patient_records before it's declared
-- in file order at parse time, which plpgsql allows (bodies aren't checked
-- until first call) — but create the trigger only now that both tables exist.
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- appointments — the single shared list both the doctor's queue view
-- and the patient's "My Appointments" / booking flows read and write.
-- ─────────────────────────────────────────────────────────────
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  doctor_id uuid not null references public.profiles(id) on delete cascade,
  specialty text,
  type text not null default 'clinic' check (type in ('video', 'clinic')),
  scheduled_date date not null,
  scheduled_time text not null, -- display value, e.g. '10:30 AM'
  reason text,
  status text not null default 'Upcoming'
    check (status in ('Upcoming', 'Waiting', 'In Progress', 'Done', 'No Show', 'Cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index appointments_patient_idx on public.appointments (patient_id, scheduled_date);
create index appointments_doctor_idx on public.appointments (doctor_id, scheduled_date);

create trigger appointments_set_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- prescriptions — one row per medication line. Refills are a flag on
-- the existing line, never a second "refill request" record that can
-- drift from what the patient is actually on.
-- ─────────────────────────────────────────────────────────────
create table public.prescriptions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  doctor_id uuid references public.profiles(id),
  med_name text not null,
  dosage text,
  schedule text, -- e.g. '1-0-1'
  duration text, -- e.g. '30 Days'
  refills_left int not null default 0,
  status text not null default 'Active' check (status in ('Active', 'Expired')),
  instructions text,
  valid_till date,
  refill_requested boolean not null default false,
  prescribed_at date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index prescriptions_patient_idx on public.prescriptions (patient_id);

create trigger prescriptions_set_updated_at
  before update on public.prescriptions
  for each row execute function public.set_updated_at();

-- Patients never get direct UPDATE on prescriptions (see RLS below) — this
-- function is their only write path, and it can only flip their own flag.
create or replace function public.request_refill(p_prescription_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.prescriptions
  set refill_requested = true
  where id = p_prescription_id
    and patient_id = auth.uid();

  if not found then
    raise exception 'Prescription not found, or not owned by the current user';
  end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- lab_reports
-- ─────────────────────────────────────────────────────────────
create table public.lab_reports (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  ordered_by uuid references public.profiles(id),
  test_category text,
  test_name text not null,
  lab_name text,
  status text not null default 'Pending' check (status in ('Pending', 'Completed')),
  urgent boolean not null default false,
  results jsonb not null default '{}'::jsonb,
  interpretation text,
  doctor_action text,
  created_at timestamptz not null default now()
);

create index lab_reports_patient_idx on public.lab_reports (patient_id);

-- ─────────────────────────────────────────────────────────────
-- payments — billing line items
-- ─────────────────────────────────────────────────────────────
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  doctor_id uuid references public.profiles(id),
  appointment_id uuid references public.appointments(id),
  service text not null,
  category text,
  amount numeric(10, 2) not null,
  status text not null default 'Pending' check (status in ('Paid', 'Pending', 'Insurance Claimed', 'Refunded')),
  method text,
  txn_ref text,
  created_at timestamptz not null default now()
);

create index payments_patient_idx on public.payments (patient_id);

-- ─────────────────────────────────────────────────────────────
-- clinical_notes — doctor chart notes. Doctor-only in this schema
-- (not surfaced to the patient portal) — see README if you want to
-- make these patient-visible later.
-- ─────────────────────────────────────────────────────────────
create table public.clinical_notes (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  doctor_id uuid not null references public.profiles(id),
  note text not null,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- cycle_logs — the one place both the dashboard's quick "Log Today"
-- and the full Tracking page log write to. Doctors get read-only
-- visibility (this is what makes "your doctor can see this" true).
-- ─────────────────────────────────────────────────────────────
create table public.cycle_logs (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  log_date date not null default current_date,
  phase text,
  flow text,
  cramps int,
  mood text,
  symptoms text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (patient_id, log_date)
);

-- ══════════════════════════════════════════════════════════════
-- Row Level Security
-- ══════════════════════════════════════════════════════════════
alter table public.profiles enable row level security;
alter table public.patient_records enable row level security;
alter table public.appointments enable row level security;
alter table public.prescriptions enable row level security;
alter table public.lab_reports enable row level security;
alter table public.payments enable row level security;
alter table public.clinical_notes enable row level security;
alter table public.cycle_logs enable row level security;

-- ─── profiles ───────────────────────────────────────────────
-- Own row, always. Patients can browse all doctors (Find a Doctor
-- directory). Doctors can see all patients (single-clinic roster —
-- if you later support multiple independent clinics, tighten this to
-- "patients I have an appointment with").
create policy "profiles_select_self" on public.profiles
  for select using (id = auth.uid());

create policy "profiles_select_patients_see_doctors" on public.profiles
  for select using (role = 'doctor');

create policy "profiles_select_doctors_see_patients" on public.profiles
  for select using (public.current_app_role() = 'doctor' and role = 'patient');

create policy "profiles_update_self" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ─── patient_records ────────────────────────────────────────
create policy "patient_records_select_own" on public.patient_records
  for select using (patient_id = auth.uid());

create policy "patient_records_select_by_doctor" on public.patient_records
  for select using (public.current_app_role() = 'doctor');

create policy "patient_records_update_own" on public.patient_records
  for update using (patient_id = auth.uid()) with check (patient_id = auth.uid());

create policy "patient_records_update_by_doctor" on public.patient_records
  for update using (public.current_app_role() = 'doctor');

-- ─── appointments ───────────────────────────────────────────
create policy "appointments_select_own" on public.appointments
  for select using (patient_id = auth.uid() or doctor_id = auth.uid());

create policy "appointments_insert_patient" on public.appointments
  for insert with check (patient_id = auth.uid());

create policy "appointments_insert_doctor" on public.appointments
  for insert with check (doctor_id = auth.uid());

create policy "appointments_update_own" on public.appointments
  for update using (patient_id = auth.uid() or doctor_id = auth.uid());

-- ─── prescriptions ──────────────────────────────────────────
-- Patients: read-only, plus the request_refill() function above.
-- Doctors: full read/write (single-clinic assumption, as above).
create policy "prescriptions_select_own" on public.prescriptions
  for select using (patient_id = auth.uid() or public.current_app_role() = 'doctor');

create policy "prescriptions_write_doctor" on public.prescriptions
  for all using (public.current_app_role() = 'doctor') with check (public.current_app_role() = 'doctor');

-- ─── lab_reports ────────────────────────────────────────────
create policy "lab_reports_select_own" on public.lab_reports
  for select using (patient_id = auth.uid() or public.current_app_role() = 'doctor');

create policy "lab_reports_write_doctor" on public.lab_reports
  for all using (public.current_app_role() = 'doctor') with check (public.current_app_role() = 'doctor');

-- ─── payments ───────────────────────────────────────────────
create policy "payments_select_own" on public.payments
  for select using (patient_id = auth.uid() or public.current_app_role() = 'doctor');

create policy "payments_write_doctor" on public.payments
  for all using (public.current_app_role() = 'doctor') with check (public.current_app_role() = 'doctor');

-- ─── clinical_notes ─────────────────────────────────────────
create policy "clinical_notes_doctor_only" on public.clinical_notes
  for all using (public.current_app_role() = 'doctor') with check (public.current_app_role() = 'doctor');

-- ─── cycle_logs ─────────────────────────────────────────────
create policy "cycle_logs_patient_full" on public.cycle_logs
  for all using (patient_id = auth.uid()) with check (patient_id = auth.uid());

create policy "cycle_logs_doctor_read" on public.cycle_logs
  for select using (public.current_app_role() = 'doctor');

-- ══════════════════════════════════════════════════════════════
-- Grants — the app only ever talks to Postgres as `authenticated`
-- (real accounts only; there's no anonymous/demo access in this schema).
-- RLS policies above are still the actual gate; these grants just let
-- the `authenticated` role reach the tables at all.
-- ══════════════════════════════════════════════════════════════
grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.profiles,
  public.patient_records,
  public.appointments,
  public.prescriptions,
  public.lab_reports,
  public.payments,
  public.clinical_notes,
  public.cycle_logs
to authenticated;
grant execute on function public.request_refill(uuid) to authenticated;


-- ==========================================
-- MIGRATION: 0002_add_requested_status.sql
-- ==========================================

-- Adds 'Requested' as a valid appointments.status value.
-- The patient-initiated booking flow creates rows in this state; a doctor's
-- approveRequest/rejectRequest action then promotes/cancels them.

alter table public.appointments
  drop constraint appointments_status_check;

alter table public.appointments
  add constraint appointments_status_check
  check (status in ('Requested', 'Upcoming', 'Waiting', 'In Progress', 'Done', 'No Show', 'Cancelled'));


-- ==========================================
-- MIGRATION: 0003_admin_tables.sql
-- ==========================================

-- Add missing tables for the Admin and AI modules

-- Add consultation_fee to profiles if doctors set their own fee,
-- or for use in revenue calculations in Admin module.
alter table public.profiles 
add column if not exists consultation_fee numeric(10, 2) not null default 0.00;

-- ─────────────────────────────────────────────────────────────
-- support_tickets
-- ─────────────────────────────────────────────────────────────
create table public.support_tickets (
  id serial primary key,
  user_name text not null,
  user_role text not null check (user_role in ('doctor', 'patient')),
  issue text not null,
  status text not null default 'Open' check (status in ('Open', 'Investigating', 'Resolved')),
  priority text not null default 'Medium' check (priority in ('Low', 'Medium', 'High')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger support_tickets_set_updated_at
  before update on public.support_tickets
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- refund_requests
-- ─────────────────────────────────────────────────────────────
create table public.refund_requests (
  id serial primary key,
  patient_name text not null,
  amount numeric(10, 2) not null,
  reason text not null,
  status text not null default 'Pending' check (status in ('Pending', 'Processed')),
  gateway text not null default 'Razorpay',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger refund_requests_set_updated_at
  before update on public.refund_requests
  for each row execute function public.set_updated_at();

-- RLS Policies
alter table public.support_tickets enable row level security;
alter table public.refund_requests enable row level security;

-- Only authenticated users can access support tickets and refund requests
-- In a real app, only admins could select all, but for now we'll mimic the "single-clinic" trust
create policy "support_tickets_select_all" on public.support_tickets for select to authenticated using (true);
create policy "support_tickets_insert_all" on public.support_tickets for insert to authenticated with check (true);
create policy "support_tickets_update_admin" on public.support_tickets for update to authenticated using (true);

create policy "refund_requests_select_all" on public.refund_requests for select to authenticated using (true);
create policy "refund_requests_insert_all" on public.refund_requests for insert to authenticated with check (true);
create policy "refund_requests_update_admin" on public.refund_requests for update to authenticated using (true);

grant select, insert, update, delete on public.support_tickets, public.refund_requests to authenticated;
grant usage, select on sequence support_tickets_id_seq to authenticated;
grant usage, select on sequence refund_requests_id_seq to authenticated;


-- ==========================================
-- MIGRATION: 0004_add_vector_rag.sql
-- ==========================================

-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- Create a table to store your documents
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  metadata jsonb,
  -- 768 dimensions is the default for Google's text-embedding-004 model
  embedding vector(768)
);

-- Create an index to speed up similarity searches (optional, but recommended for large datasets)
create index if not exists documents_embedding_idx on documents using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Create a function to search for documents
create or replace function match_documents (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where 1 - (documents.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
$$;


-- ==========================================
-- MIGRATION: 0005_billing_ops_tables.sql
-- ==========================================

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


-- ==========================================
-- MIGRATION: 0006_schema_hardening.sql
-- ==========================================

-- Schema hardening pass — addresses the findings from a table-structure review:
--   1. profiles.role had no 'admin' value, so AdminController couldn't do a real
--      role check and fell back to a fake header-substring check.
--   2. support_tickets / refund_requests stored the filer's name as free text
--      with no FK back to profiles.
--   3. profiles had no email column, even though the frontend reads profile.email.
--   4. appointments.scheduled_time was a display string ('10:30 AM'), which
--      sorts incorrectly across noon and carries no timezone.
--   5. No constraint stopped a double-submit from creating two 'Pending'
--      payment rows for the same appointment.
--   6. payments had no index on doctor_id, despite doctor billing queries
--      filtering on it.
--   7. lab_reports and payments are both updated in place (review workflow,
--      pay workflow) but neither tracked updated_at.

-- ─────────────────────────────────────────────────────────────
-- 1. Admin role
-- ─────────────────────────────────────────────────────────────
alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('doctor', 'patient', 'admin'));

-- Admin accounts are provisioned manually (Supabase dashboard / a service-role
-- script) — the public /api/auth/register endpoint still only accepts
-- 'doctor' | 'patient' (enforced in RegisterDto, not by this constraint).

-- ─────────────────────────────────────────────────────────────
-- 2. support_tickets / refund_requests — real FKs alongside the existing
-- text columns. The text columns stay: they're a display-safe snapshot that
-- survives even if the referenced profile is later deleted (on delete set
-- null keeps the ticket row). PK type (serial) is intentionally left as-is —
-- converting to uuid would require changing AdminController's Number(id)
-- parsing and isn't needed to fix the referential-integrity gap.
-- ─────────────────────────────────────────────────────────────
alter table public.support_tickets
  add column if not exists user_id uuid references public.profiles(id) on delete set null;

update public.support_tickets st
set user_id = p.id
from public.profiles p
where st.user_id is null and p.full_name = st.user_name and p.role = st.user_role;

create index if not exists support_tickets_user_idx on public.support_tickets (user_id);

alter table public.refund_requests
  add column if not exists patient_id uuid references public.profiles(id) on delete set null;

update public.refund_requests rr
set patient_id = p.id
from public.profiles p
where rr.patient_id is null and p.full_name = rr.patient_name and p.role = 'patient';

create index if not exists refund_requests_patient_idx on public.refund_requests (patient_id);

-- ─────────────────────────────────────────────────────────────
-- 3. profiles.email — backfilled from auth.users, kept in sync going forward.
-- ─────────────────────────────────────────────────────────────
alter table public.profiles add column if not exists email text;

update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email is null;

create unique index if not exists profiles_email_uq on public.profiles (email);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role text := coalesce(new.raw_user_meta_data->>'role', 'patient');
begin
  insert into public.profiles (id, role, full_name, specialty, email)
  values (
    new.id,
    v_role,
    coalesce(new.raw_user_meta_data->>'full_name', 'New User'),
    new.raw_user_meta_data->>'specialty',
    new.email
  );

  if v_role = 'patient' then
    insert into public.patient_records (patient_id, mrn)
    values (new.id, 'HN-' || (100000 + floor(random() * 900000))::int);
  end if;

  return new;
end;
$$;

create or replace function public.sync_profile_email()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute function public.sync_profile_email();

-- ─────────────────────────────────────────────────────────────
-- 4. appointments.scheduled_at — a real timestamptz, derived from the
-- existing scheduled_date + scheduled_time columns and kept in sync by
-- trigger. scheduled_date/scheduled_time are left in place so existing app
-- code keeps working unchanged; new code (ordering, range queries) should
-- prefer scheduled_at.
-- ─────────────────────────────────────────────────────────────
alter table public.appointments add column if not exists scheduled_at timestamptz;

update public.appointments
set scheduled_at = (scheduled_date::text || ' ' || scheduled_time)::timestamp
where scheduled_at is null;

create or replace function public.sync_appointment_scheduled_at()
returns trigger language plpgsql as $$
begin
  new.scheduled_at := (new.scheduled_date::text || ' ' || new.scheduled_time)::timestamp;
  return new;
end;
$$;

drop trigger if exists appointments_sync_scheduled_at on public.appointments;
create trigger appointments_sync_scheduled_at
  before insert or update of scheduled_date, scheduled_time on public.appointments
  for each row execute function public.sync_appointment_scheduled_at();

create index if not exists appointments_scheduled_at_idx on public.appointments (scheduled_at);

-- ─────────────────────────────────────────────────────────────
-- 5. One 'Pending' payment per appointment, enforced — closes the
-- double-submit race in BillingService.pay().
-- ─────────────────────────────────────────────────────────────
create unique index if not exists payments_appointment_pending_uq
  on public.payments (appointment_id)
  where status = 'Pending';

-- ─────────────────────────────────────────────────────────────
-- 6. Missing index for doctor-scoped billing queries.
-- ─────────────────────────────────────────────────────────────
create index if not exists payments_doctor_idx on public.payments (doctor_id);

-- ─────────────────────────────────────────────────────────────
-- 7. updated_at on the two tables that get updated in place but never
-- tracked it: lab review (interpretation/status) and payment settlement.
-- ─────────────────────────────────────────────────────────────
alter table public.lab_reports add column if not exists updated_at timestamptz not null default now();
drop trigger if exists lab_reports_set_updated_at on public.lab_reports;
create trigger lab_reports_set_updated_at
  before update on public.lab_reports
  for each row execute function public.set_updated_at();

alter table public.payments add column if not exists updated_at timestamptz not null default now();
drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();


-- ==========================================
-- MIGRATION: 0007_tracking_logs.sql
-- ==========================================

-- Backs the patient Tracking page (vitals, androgen/hirsutism grading, and
-- the daily PCOS lifestyle checklist), which previously only held state in
-- component memory. Mirrors the cycle_logs pattern already used on this page:
-- patient has full read/write on their own rows, doctor gets read-only.

-- ─────────────────────────────────────────────────────────────
-- vitals_logs — one row per reading. Covers weight/bp/sugar/sleep and the
-- Ferriman-Gallwey hirsutism grade (vital_key = 'hirsutism', value = grade
-- as text). History is kept (not upserted) so trend-vs-last-reading can be
-- computed from the second-latest row per key.
-- ─────────────────────────────────────────────────────────────
create table public.vitals_logs (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  vital_key text not null check (vital_key in ('weight', 'bp', 'sugar', 'sleep', 'hirsutism')),
  value text not null,
  unit text not null default '',
  logged_at timestamptz not null default now()
);

create index vitals_logs_patient_key_idx on public.vitals_logs (patient_id, vital_key, logged_at desc);

-- ─────────────────────────────────────────────────────────────
-- lifestyle_logs — one row per patient per day for the daily habits
-- checklist. completed_count is derived from items but kept as a column so
-- the dashboard can query completion without unpacking jsonb.
-- ─────────────────────────────────────────────────────────────
create table public.lifestyle_logs (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  log_date date not null default current_date,
  items jsonb not null default '{}',
  completed_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (patient_id, log_date)
);

create trigger lifestyle_logs_set_updated_at
  before update on public.lifestyle_logs
  for each row execute function public.set_updated_at();

-- ══════════════════════════════════════════════════════════════
-- Row Level Security
-- ══════════════════════════════════════════════════════════════
alter table public.vitals_logs enable row level security;
alter table public.lifestyle_logs enable row level security;

create policy "vitals_logs_patient_full" on public.vitals_logs
  for all using (patient_id = auth.uid()) with check (patient_id = auth.uid());

create policy "vitals_logs_doctor_read" on public.vitals_logs
  for select using (public.current_app_role() = 'doctor');

create policy "lifestyle_logs_patient_full" on public.lifestyle_logs
  for all using (patient_id = auth.uid()) with check (patient_id = auth.uid());

create policy "lifestyle_logs_doctor_read" on public.lifestyle_logs
  for select using (public.current_app_role() = 'doctor');

grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.vitals_logs,
  public.lifestyle_logs
to authenticated;


-- ==========================================
-- MIGRATION: 0008_care_connections.sql
-- ==========================================

-- Backs the patient Family / Care Circle page, which previously only held
-- invited connections in component memory. A care connection is a patient
-- sharing a limited, permissioned view of their data with someone outside
-- the clinical relationship (partner, caregiver, family member) — the
-- invitee need not have a Healnari account, so this is keyed by email, not
-- a profiles FK. Unlike vitals_logs/cycle_logs, doctors get no read access
-- here: this is the patient's private social layer, not clinical data.

create table public.care_connections (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  invitee_email text not null,
  invitee_name text not null,
  relation text not null default 'Partner / Spouse',
  status text not null default 'Pending Acceptance' check (status in ('Pending Acceptance', 'Connected')),
  permissions jsonb not null default '{"cycleWindow": true, "appointments": false, "detailedRx": false}',
  invite_token text not null default encode(gen_random_bytes(6), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (patient_id, invitee_email)
);

create unique index care_connections_invite_token_uq on public.care_connections (invite_token);
create index care_connections_patient_idx on public.care_connections (patient_id);

create trigger care_connections_set_updated_at
  before update on public.care_connections
  for each row execute function public.set_updated_at();

-- ══════════════════════════════════════════════════════════════
-- Row Level Security — patient-only, no doctor visibility.
-- ══════════════════════════════════════════════════════════════
alter table public.care_connections enable row level security;

create policy "care_connections_patient_full" on public.care_connections
  for all using (patient_id = auth.uid()) with check (patient_id = auth.uid());

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.care_connections to authenticated;


-- ==========================================
-- MIGRATION: 0009_admin_tables.sql
-- ==========================================

-- ─────────────────────────────────────────────────────────────
-- Admin Portal Tables: CMS, Templates, Broadcasts, Reports
-- ─────────────────────────────────────────────────────────────

create table public.message_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger message_templates_set_updated_at
  before update on public.message_templates
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- broadcast_history
-- ─────────────────────────────────────────────────────────────
create table public.broadcast_history (
  id uuid primary key default gen_random_uuid(),
  display_id text not null,
  subject text not null,
  audience text not null,
  status text not null default 'Sent' check (status in ('Sent', 'Scheduled', 'Draft', 'Failed')),
  opens text default '-',
  clicks text default '-',
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- reports_history
-- ─────────────────────────────────────────────────────────────
create table public.reports_history (
  id uuid primary key default gen_random_uuid(),
  report_id text not null unique,
  name text not null,
  type text not null,
  date timestamptz not null default now(),
  size text not null default '0 KB',
  status text not null default 'Generated' check (status in ('Generated', 'Failed', 'Processing')),
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- cms_articles (articles/banners/faqs)
-- ─────────────────────────────────────────────────────────────
create table public.cms_articles (
  id uuid primary key default gen_random_uuid(),
  display_id text not null unique,
  title text not null,
  author text not null,
  category text not null,
  status text not null default 'Draft' check (status in ('Draft', 'Published', 'Archived')),
  views text default '0',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger cms_articles_set_updated_at
  before update on public.cms_articles
  for each row execute function public.set_updated_at();

-- RLS Policies
alter table public.message_templates enable row level security;
alter table public.broadcast_history enable row level security;
alter table public.reports_history enable row level security;
alter table public.cms_articles enable row level security;

-- Admins get full access
create policy "admin_all_message_templates" on public.message_templates for all to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');
create policy "admin_all_broadcast_history" on public.broadcast_history for all to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');
create policy "admin_all_reports_history" on public.reports_history for all to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');
create policy "admin_all_cms_articles" on public.cms_articles for all to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');

-- Everyone can read published CMS articles
create policy "public_read_published_cms" on public.cms_articles for select to authenticated using (status = 'Published');

grant select, insert, update, delete on public.message_templates, public.broadcast_history, public.reports_history, public.cms_articles to authenticated;


-- ==========================================
-- MIGRATION: 0010_avatar_storage.sql
-- ==========================================

-- Backs the Profile page's "Change Photo" — previously a fake upload that
-- just showed a success toast. Uploads are mediated by the vision backend
-- using the service-role client (never directly from the frontend, per the
-- app's existing "frontend only ever talks to vision" convention), so
-- these RLS policies are defense-in-depth rather than load-bearing: they
-- matter if storage is ever reached with a non-service-role key.
--
-- Objects are stored at `<patient_id>/avatar.<ext>` inside the bucket, so
-- `storage.foldername(name)` (which splits the object path on '/') gives
-- the owning user's id as its first element.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars_owner_write" on storage.objects
  for insert with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_owner_update" on storage.objects
  for update using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_owner_delete" on storage.objects
  for delete using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);


-- ==========================================
-- MIGRATION: 0011_patient_dashboard_dynamism.sql
-- ==========================================

-- Replaces several remaining fake/local-only widgets on the patient
-- dashboard with real, persisted data: doctor favourites (Discovery page),
-- the appointment waitlist card, notification preferences, and the
-- Profile page's city field (which previously had nowhere to save to).

-- ─────────────────────────────────────────────────────────────
-- doctor_favorites — a patient's saved/starred doctors on the Discovery
-- page. Was local component state that reset on every reload.
-- ─────────────────────────────────────────────────────────────
create table public.doctor_favorites (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  doctor_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (patient_id, doctor_id)
);

create index doctor_favorites_patient_idx on public.doctor_favorites (patient_id);

alter table public.doctor_favorites enable row level security;

create policy "doctor_favorites_patient_full" on public.doctor_favorites
  for all using (patient_id = auth.uid()) with check (patient_id = auth.uid());

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.doctor_favorites to authenticated;

-- ─────────────────────────────────────────────────────────────
-- appointment_waitlist — join-a-waitlist for a fully booked doctor.
-- Queue position is computed at read time (count of earlier still-waiting
-- rows for the same doctor), not stored, so it stays correct as people
-- join/leave ahead of you.
-- ─────────────────────────────────────────────────────────────
create table public.appointment_waitlist (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  doctor_id uuid not null references public.profiles(id) on delete cascade,
  preferred_window text not null,
  status text not null default 'Waiting' check (status in ('Waiting', 'Notified', 'Cancelled')),
  created_at timestamptz not null default now()
);

create index appointment_waitlist_doctor_idx on public.appointment_waitlist (doctor_id, status, created_at);
create index appointment_waitlist_patient_idx on public.appointment_waitlist (patient_id);

alter table public.appointment_waitlist enable row level security;

create policy "appointment_waitlist_patient_full" on public.appointment_waitlist
  for all using (patient_id = auth.uid()) with check (patient_id = auth.uid());

create policy "appointment_waitlist_doctor_read" on public.appointment_waitlist
  for select using (doctor_id = auth.uid());

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.appointment_waitlist to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Notification preferences — Profile page toggles that previously only
-- lived in component state.
-- ─────────────────────────────────────────────────────────────
alter table public.profiles add column if not exists email_notifications boolean not null default true;
alter table public.profiles add column if not exists sms_notifications boolean not null default true;

-- ─────────────────────────────────────────────────────────────
-- City — Profile page field that previously had no backing column at all.
-- ─────────────────────────────────────────────────────────────
alter table public.patient_records add column if not exists city text;


-- ==========================================
-- MIGRATION: 0012_notifications.sql
-- ==========================================

-- In-app notifications — backs the bell dropdown on both the patient and
-- doctor dashboards, which previously rendered a hardcoded local array.
-- Rows are written by the backend (service-role client) whenever something
-- notification-worthy happens (appointment approved/rejected/cancelled,
-- a new request comes in, a doctor sends a push broadcast); the same write
-- also fans out over the notifications socket gateway for a live toast, so
-- this table is the durable record a client (re)reads on load/reconnect.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  data jsonb not null default '{}'::jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

-- Only the backend's service-role client inserts (it resolves the recipient
-- itself, e.g. "the other party on this appointment") — no insert policy
-- for authenticated users. Owners can read and mark their own as read.
create policy "notifications_owner_select" on public.notifications
  for select using (user_id = auth.uid());

create policy "notifications_owner_update" on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

grant usage on schema public to authenticated;
grant select, update on public.notifications to authenticated;


-- ==========================================
-- MIGRATION: 0013_push_subscriptions.sql
-- ==========================================

-- Web Push subscriptions — one row per browser/device a user has granted
-- notification permission on. Backs delivery of incoming-call alerts (and
-- other notifications) via the Push API even when the app tab is closed or
-- backgrounded. Written only by the backend's service-role client, on
-- behalf of the authenticated caller registering their own browser — see
-- NotificationsService.create(), which fans a notification out here after
-- writing to public.notifications and emitting over the socket gateway.

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- Only the backend's service-role client inserts/deletes (it resolves the
-- caller's identity itself) — no insert policy for authenticated users.
-- Owners can read and remove their own subscriptions.
create policy "push_subscriptions_owner_select" on public.push_subscriptions
  for select using (user_id = auth.uid());

create policy "push_subscriptions_owner_delete" on public.push_subscriptions
  for delete using (user_id = auth.uid());

grant usage on schema public to authenticated;
grant select, delete on public.push_subscriptions to authenticated;


-- ==========================================
-- MIGRATION: 0014_lab_reports_upload.sql
-- ==========================================

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


-- ==========================================
-- MIGRATION: 0015_broadcast_channels.sql
-- ==========================================

-- The admin broadcast composer (Communications.jsx) has always had Email/Push
-- delivery-channel toggles, but the backend silently discarded them — every
-- broadcast was recorded as "Sent" with no record of what channel was
-- requested or how many real recipients it reached. These columns let the
-- backend record that honestly once it actually resolves the audience and
-- fans out a real push notification (see AdminService.sendBroadcast).
alter table public.broadcast_history
  add column if not exists channels text[] not null default '{}',
  add column if not exists recipient_count integer not null default 0;


-- ==========================================
-- MIGRATION: 0016_admin_persistence_gaps.sql
-- ==========================================

-- Closes three admin-panel gaps where an action looked like it worked but
-- nothing was ever persisted:
--
-- 1. Suspend/Activate (Users.jsx, Doctor/PatientDetails.jsx) had no column
--    to write to — the backend comment literally said "no dedicated column
--    yet so just return updated flag". Every suspension silently reverted
--    on the next page load, and a suspended user could still log in.
-- 2. Doctor commission rate was hardcoded to 15% for every doctor
--    everywhere — the admin's commission slider on DoctorDetails.jsx never
--    actually changed anything.
-- 3. "Process Payout" had nowhere to store the bank/UPI reference number
--    the admin enters when marking a payout as paid.
alter table public.profiles
  add column if not exists status text not null default 'Active' check (status in ('Active', 'Suspended')),
  add column if not exists commission_rate numeric(5,2) not null default 15;

alter table public.payouts
  add column if not exists reference_id text;

-- Message templates always had a channel (email/whatsapp/push) and target
-- audience concept in the admin UI (TemplatesManager.jsx's create/edit
-- form collects both), but the backend only ever stored name/content —
-- every template in the list rendered with blank Channel/Audience cells.
alter table public.message_templates
  add column if not exists type text not null default 'email' check (type in ('email', 'whatsapp', 'push')),
  add column if not exists audience text not null default 'General' check (audience in ('General', 'Patient', 'Doctor'));


-- ==========================================
-- MIGRATION: 0017_prescription_grouping.sql
-- ==========================================

-- The prescriptions table stores one row per medication line with no way to
-- tell which lines were written together in the same doctor visit — the
-- patient-facing UI rendered every medicine as its own separate
-- "prescription" card instead of one prescription with several medicines.
-- group_id ties every line from a single "Write Prescription" submission
-- together; diagnosis was collected on that form but had nowhere to be
-- saved, so it was silently discarded on every prescription ever issued.
alter table public.prescriptions
  add column if not exists group_id uuid,
  add column if not exists diagnosis text;

create index if not exists prescriptions_group_idx on public.prescriptions (group_id);


-- ==========================================
-- MIGRATION: 0018_public_leads.sql
-- ==========================================

-- Reconstructed from the live database schema — the original file for this
-- migration was corrupted (contained only 4 bytes of garbage) and could not
-- reproduce the two tables it was supposed to create. Both tables already
-- exist and are in active use (leads.service.ts); this file makes source
-- control match reality again so a fresh environment/restore doesn't
-- silently end up missing them. Written idempotently (if not exists) so
-- re-running it against the already-correct live database is a no-op.
--
-- Unlike the RLS pattern in 0003_admin_tables.sql (using (true) for any
-- authenticated user — see AUDIT_REPORT.md DB-6), these policies are scoped
-- correctly from the start: anonymous insert only (the public landing page
-- submits without login), doctor/admin-scoped reads.

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists newsletter_subscribers_email_uq
  on public.newsletter_subscribers (email);

create table if not exists public.consultation_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  age integer,
  mobile text not null,
  concern text,
  specialty_recommendation text,
  preferred_date date,
  preferred_time text,
  notes text,
  status text not null default 'New' check (status in ('New', 'Converted', 'Closed')),
  created_at timestamptz not null default now(),
  email text,
  doctor_id uuid references public.profiles(id) on delete set null,
  patient_id uuid references public.profiles(id) on delete set null
);

create index if not exists consultation_requests_doctor_idx on public.consultation_requests (doctor_id);
create index if not exists consultation_requests_status_idx on public.consultation_requests (status);

alter table public.newsletter_subscribers enable row level security;
alter table public.consultation_requests enable row level security;

drop policy if exists "newsletter_subscribers_insert_anon" on public.newsletter_subscribers;
create policy "newsletter_subscribers_insert_anon" on public.newsletter_subscribers
  for insert to anon, authenticated with check (true);

drop policy if exists "newsletter_subscribers_select_admin" on public.newsletter_subscribers;
create policy "newsletter_subscribers_select_admin" on public.newsletter_subscribers
  for select to authenticated using (current_app_role() = 'admin');

drop policy if exists "consultation_requests_insert_anon" on public.consultation_requests;
create policy "consultation_requests_insert_anon" on public.consultation_requests
  for insert to anon, authenticated with check (true);

drop policy if exists "consultation_requests_select_own_doctor" on public.consultation_requests;
create policy "consultation_requests_select_own_doctor" on public.consultation_requests
  for select to authenticated using (doctor_id = auth.uid() or current_app_role() = 'admin');

drop policy if exists "consultation_requests_update_own_doctor" on public.consultation_requests;
create policy "consultation_requests_update_own_doctor" on public.consultation_requests
  for update to authenticated using (doctor_id = auth.uid() or current_app_role() = 'admin');

grant select, insert on public.newsletter_subscribers to anon;
grant select, insert, update on public.consultation_requests to anon, authenticated;


-- ==========================================
-- MIGRATION: 0019_consultation_request_conversion.sql
-- ==========================================

-- Lets a public consultation request name a specific real doctor (not just
-- a specialty label) and, once that doctor approves it, links to the real
-- patient account + appointment the approval created — so the request
-- can't be double-converted and the admin Leads view can show what it
-- turned into.
alter table public.consultation_requests
  add column if not exists email text,
  add column if not exists doctor_id uuid references public.profiles(id),
  add column if not exists patient_id uuid references public.profiles(id);

create index if not exists consultation_requests_doctor_idx on public.consultation_requests (doctor_id, status);


-- ==========================================
-- MIGRATION: 0020_appointment_double_booking.sql
-- ==========================================

-- Two patients booking the same doctor/date/time concurrently both
-- succeeded — appointments.create() never checked for a conflict, and the
-- ERROR_MESSAGES.APPOINTMENT_CONFLICT string existed but was never thrown
-- anywhere. GET .../slots already filtered out booked times client-side,
-- but that's a UI nicety, not a guarantee: two requests racing between
-- "fetch available slots" and "book" could both pass that check. A DB
-- constraint is the only thing that's actually race-proof.
create unique index if not exists appointments_no_double_booking
  on public.appointments (doctor_id, scheduled_date, scheduled_time)
  where status not in ('Cancelled', 'No Show');


-- ==========================================
-- MIGRATION: 0021_appointment_reminders.sql
-- ==========================================

-- Tracks whether a pre-appointment reminder has already gone out, so the
-- reminder cron (AppointmentsService.sendUpcomingReminders) doesn't
-- re-notify the same patient every time it runs.
alter table public.appointments
  add column if not exists reminder_sent_at timestamptz;


-- ==========================================
-- MIGRATION: 0022_appointment_delay_notifications.sql
-- ==========================================

-- Idempotency guard for the delay-notification sweep
-- (AppointmentsService.sendDelayNotifications) — without it, every 5-minute
-- cron tick would re-notify the same still-delayed patient over and over.
alter table public.appointments
  add column if not exists delay_notified_at timestamptz;


-- ==========================================
-- MIGRATION: 0023_cashfree_payment_gateway.sql
-- ==========================================

-- Real payment gateway integration (Cashfree). Payments are only ever
-- marked 'Paid' after a server-to-server call to Cashfree confirms the
-- order — the previous pay() flow, which marked a payment 'Paid' the
-- instant the frontend asked, is being retired in the same release.

alter table public.payments add column if not exists cf_order_id text;
alter table public.payments add column if not exists cf_payment_id text;

create unique index if not exists payments_cf_order_id_uq
  on public.payments (cf_order_id)
  where cf_order_id is not null;

alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments add constraint payments_status_check
  check (status in ('Paid', 'Pending', 'Insurance Claimed', 'Refunded', 'Failed'));


-- ==========================================
-- MIGRATION: 0024_real_refunds.sql
-- ==========================================

-- Cancelling a paid appointment used to flip payments.status straight to
-- 'Refunded' the instant it was cancelled — before any money had actually
-- moved and before an admin had even looked at the refund_requests row.
-- Split that into an honest two-step: 'Refund Pending' the moment a refund
-- is owed, 'Refunded' only once admin.processRefund() confirms a real
-- Cashfree refund (or, for non-gateway/cash payments with no cf_order_id,
-- once an admin manually confirms the money actually went back).

alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments add constraint payments_status_check
  check (status in ('Paid', 'Pending', 'Insurance Claimed', 'Refunded', 'Failed', 'Refund Pending'));

alter table public.refund_requests add column if not exists payment_id uuid references public.payments(id) on delete set null;
alter table public.refund_requests add column if not exists cf_refund_id text;

create index if not exists refund_requests_payment_idx on public.refund_requests (payment_id);

-- 'gateway' was always 'Razorpay' — a leftover label from before any real
-- gateway was integrated. Refunds now actually go through Cashfree.
alter table public.refund_requests alter column gateway set default 'Cashfree';
update public.refund_requests set gateway = 'Cashfree' where gateway = 'Razorpay';


-- ==========================================
-- MIGRATION: 0025_care_relationship_and_rls_fix.sql
-- ==========================================

-- SEC-1 fix: any KYC-verified doctor could read/write ANY patient's records
-- (lab reports, documents, vaccinations, emergency contacts, prescriptions,
-- clinical notes) regardless of ever having treated them — see
-- AUDIT_REPORT.md SEC-1 / DB-7. The application-layer fix scopes doctor
-- access to patients they have an actual appointment with; this column
-- covers the one legitimate case that wouldn't otherwise have an
-- appointment yet — a doctor manually registering a walk-in patient
-- (PatientsService.create()) before any appointment exists.
alter table public.patient_records add column if not exists created_by_doctor_id uuid references public.profiles(id) on delete set null;

-- DB-6 fix: these two policies granted blanket select/update to ANY
-- authenticated user (using (true)) even though RLS here is defense-in-depth
-- only (the app always talks to Postgres via the service-role client) — see
-- AUDIT_REPORT.md DB-6. Neither table has a real end-user insert path in the
-- application (both are only ever written by backend services), so both are
-- tightened to admin-only, matching the access pattern actually in use.
drop policy if exists "support_tickets_select_all" on public.support_tickets;
drop policy if exists "support_tickets_insert_all" on public.support_tickets;
drop policy if exists "support_tickets_update_admin" on public.support_tickets;
create policy "support_tickets_select_admin" on public.support_tickets
  for select to authenticated using (current_app_role() = 'admin');
create policy "support_tickets_insert_admin" on public.support_tickets
  for insert to authenticated with check (current_app_role() = 'admin');
create policy "support_tickets_update_admin" on public.support_tickets
  for update to authenticated using (current_app_role() = 'admin');

drop policy if exists "refund_requests_select_all" on public.refund_requests;
drop policy if exists "refund_requests_insert_all" on public.refund_requests;
drop policy if exists "refund_requests_update_admin" on public.refund_requests;
create policy "refund_requests_select_own_or_admin" on public.refund_requests
  for select to authenticated using (current_app_role() = 'admin' or patient_id = auth.uid());
create policy "refund_requests_insert_admin" on public.refund_requests
  for insert to authenticated with check (current_app_role() = 'admin');
create policy "refund_requests_update_admin" on public.refund_requests
  for update to authenticated using (current_app_role() = 'admin');


-- ==========================================
-- MIGRATION: 0026_admin_audit_log.sql
-- ==========================================

-- AUDIT_REPORT.md SEC-6 — admin actions with real consequences (KYC
-- approval, refund/payout processing, broadcast sends, ticket resolution)
-- had no who/what/when/before/after trail anywhere. RLS here is the same
-- defense-in-depth-only pattern as every other admin table (the app writes
-- via the service-role client) — admin-only read as a backstop.

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_name text,
  action text not null,
  entity text not null,
  entity_id text,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_actor_idx on public.audit_log (actor_id);
create index audit_log_entity_idx on public.audit_log (entity, entity_id);
create index audit_log_created_idx on public.audit_log (created_at desc);

alter table public.audit_log enable row level security;

create policy "audit_log_select_admin" on public.audit_log
  for select to authenticated using (current_app_role() = 'admin');
create policy "audit_log_insert_admin" on public.audit_log
  for insert to authenticated with check (current_app_role() = 'admin');


-- ==========================================
-- MIGRATION: 0027_timezone_currency.sql
-- ==========================================

-- AUDIT_REPORT.md DB-2 — this is not just a UAE-readiness gap, it is a
-- currently-active bug confirmed live this session: inserting an
-- appointment for "10:30 AM" produced scheduled_at = 2026-08-20T10:30:00+00
-- (UTC) instead of the correct 2026-08-20T05:00:00+00 (10:30 IST converted
-- to UTC). Every reminder/delay-notification comparison against real UTC
-- now() has therefore been running ~5.5 hours off for every appointment on
-- the platform — not a future-market problem, a live one.
--
-- Root cause: sync_appointment_scheduled_at() (migration 0006) cast the
-- date+time text straight to `timestamp` and let it fall into the
-- `timestamptz` column using the DB session's timezone (UTC), instead of
-- explicitly interpreting it in the doctor's own timezone.

alter table public.profiles add column if not exists timezone text not null default 'Asia/Kolkata';

create or replace function public.sync_appointment_scheduled_at()
returns trigger language plpgsql as $$
declare
  doctor_tz text;
begin
  select timezone into doctor_tz from public.profiles where id = new.doctor_id;
  new.scheduled_at := (new.scheduled_date::text || ' ' || new.scheduled_time)::timestamp
    at time zone coalesce(doctor_tz, 'Asia/Kolkata');
  return new;
end;
$$;

-- Re-derive every existing row with the corrected logic — these were all
-- computed with the buggy trigger, so this is a real correction, not a
-- backfill of nulls.
update public.appointments a
set scheduled_at = (a.scheduled_date::text || ' ' || a.scheduled_time)::timestamp
  at time zone coalesce((select p.timezone from public.profiles p where p.id = a.doctor_id), 'Asia/Kolkata');

-- AUDIT_REPORT.md DB-3 — no currency field existed anywhere; every amount
-- implicitly assumed INR. Adding the column now (all existing/new rows
-- default to 'INR', matching current real-world behavior exactly) so
-- billing code can start threading a real currency through without a
-- second migration once UAE/AED pricing is actually wired up.
alter table public.payments add column if not exists currency text not null default 'INR';
alter table public.profiles add column if not exists currency text not null default 'INR';
alter table public.payouts add column if not exists currency text not null default 'INR';
alter table public.refund_requests add column if not exists currency text not null default 'INR';


-- ==========================================
-- MIGRATION: 0028_documents_rls.sql
-- ==========================================

-- AUDIT_REPORT.md DB-8 — `documents` (pgvector RAG knowledge base for the
-- landing-page AI chat) had RLS disabled and no owner column, undocumented
-- as to whether that was intentional. It is: this is a single shared
-- knowledge base, not per-user data — there's no "owner" to scope rows to.
-- It's only ever read via match_documents(), called through the backend's
-- service-role client (bypasses RLS regardless), so enabling RLS here is
-- pure defense-in-depth against a hypothetical direct anon-key read/write —
-- no application code path is affected.
--
-- If this table is ever repurposed to store per-user embeddings, add an
-- owner column and a real ownership-scoped select policy before doing so —
-- the current "no direct client access at all" policy set below would be
-- actively wrong for that use case, not just incomplete.

alter table public.documents enable row level security;

create policy "documents_admin_only" on public.documents
  for all to authenticated using (current_app_role() = 'admin') with check (current_app_role() = 'admin');

comment on table public.documents is
  'Shared pgvector knowledge base for the public landing-page AI chat (ai.service.ts handleLandingAgent). Not per-user data — do not add per-row ownership without also revisiting the RLS policy above.';


-- ==========================================
-- MIGRATION: 0029_perf_indexes.sql
-- ==========================================

-- Performance indexes for hot read paths.

-- Public doctor directory (doctors.service.ts search()) and admin user
-- listing (admin.service.ts getAllUsers()) both filter profiles by role
-- (+ kyc_verified for the public directory) on every call; profiles had
-- no index beyond the primary key.
create index if not exists profiles_role_kyc_idx on public.profiles (role, kyc_verified);

-- doctors.service.ts search() does `ilike('full_name', '%q%')` — a
-- leading-wildcard ILIKE can't use a plain btree index. pg_trgm + a GIN
-- index lets Postgres use a trigram index scan instead of a full table
-- scan as the doctor directory grows.
create extension if not exists pg_trgm;
create index if not exists profiles_full_name_trgm_idx on public.profiles using gin (full_name gin_trgm_ops);

-- payments only had a *partial* index on appointment_id (where status =
-- 'Pending', migration 0006, for the double-submit guard). Lookups that
-- filter by appointment_id + any other status — e.g. billing.service.ts's
-- "already paid?" check — fall through to a sequential scan as the table
-- grows. A plain index covers those too.
create index if not exists payments_appointment_idx on public.payments (appointment_id);


-- ==========================================
-- MIGRATION: 0030_international_country_payout_support.sql
-- ==========================================

-- Migration 0030: International Country, Currency, and Payout Banking Support
-- Adds country, localized currency, and payout details across profiles, consultation_requests, and appointments

-- 1. Consultation Requests: Add country, currency, and fee fields for global patient bookings
alter table public.consultation_requests
  add column if not exists country text not null default 'US',
  add column if not exists currency text not null default 'USD',
  add column if not exists fee numeric(10, 2);

-- 2. Profiles: Add country and country-specific banking/payout configuration
alter table public.profiles
  add column if not exists country text not null default 'IN',
  add column if not exists payout_bank_details jsonb not null default '{}'::jsonb,
  add column if not exists medical_council text;

-- 3. Appointments: Track consultation country and currency for billing consistency
alter table public.appointments
  add column if not exists country text not null default 'IN',
  add column if not exists currency text not null default 'INR';

-- 4. Payments: Ensure country column exists for multi-gateway reconciliation (Stripe vs Cashfree)
alter table public.payments
  add column if not exists country text not null default 'IN',
  add column if not exists gateway text not null default 'Cashfree';

-- 5. Indexes for fast country and currency queries
create index if not exists consultation_requests_country_idx on public.consultation_requests (country, currency);
create index if not exists profiles_country_idx on public.profiles (country);
create index if not exists payments_currency_gateway_idx on public.payments (currency, gateway);


-- ==========================================
-- MIGRATION: 0031_cron_manager_tables.sql
-- ==========================================

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


-- ==========================================
-- MIGRATION: 0032_email_templates_system.sql
-- ==========================================

-- ============================================================================
-- Migration 0032: Database-Managed Message & Email Templates System
-- ============================================================================
-- Extends public.message_templates to support slug-based system email templates
-- with subject lines, variable placeholders, and admin management.
-- ============================================================================

alter table public.message_templates
  add column if not exists slug text unique,
  add column if not exists subject text,
  add column if not exists description text,
  add column if not exists is_system boolean not null default false,
  add column if not exists variables_hint jsonb default '[]'::jsonb;

create index if not exists idx_message_templates_slug on public.message_templates (slug);

-- Seed / Upsert Core System Transactional Email Templates
insert into public.message_templates (slug, name, type, audience, subject, description, is_system, variables_hint, content)
values
(
  'appointment_confirmed',
  'Patient Appointment Confirmation',
  'email',
  'Patient',
  '✅ Confirmed: Consultation with Dr. {{doctorName}} on {{when}}',
  'Sent to the patient when a doctor or clinic approves/confirms their booking.',
  true,
  '["patientName", "doctorName", "when", "label", "dashboardUrl"]'::jsonb,
  '<div style="font-family:sans-serif;max-width:550px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
    <h2 style="color:#10b981;margin-top:0;">✅ Appointment Confirmed</h2>
    <p>Hello {{patientName}},</p>
    <p>Your {{label}} with <strong>Dr. {{doctorName}}</strong> has been confirmed.</p>
    <div style="background:#f8fafc;padding:16px;border-radius:8px;border:1px solid #e2e8f0;margin:16px 0;">
      <p style="margin:4px 0;font-size:13px;color:#64748b;">Consultation Date & Time:</p>
      <h3 style="margin:4px 0;color:#0f172a;">{{when}}</h3>
      <p style="margin:8px 0 0 0;font-size:12px;color:#64748b;">Type: <strong>{{label}}</strong></p>
    </div>
    <div style="margin:20px 0;">
      <a href="{{dashboardUrl}}" style="background:#0f172a;color:#fff;padding:10px 20px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:13px;">View Appointment Details</a>
    </div>
    <p style="color:#94a3b8;font-size:11px;">Please log in 5 minutes early to test your camera and audio.</p>
  </div>'
),
(
  'appointment_cancelled',
  'Appointment Cancellation Notice',
  'email',
  'Patient',
  'Cancelled: Consultation on {{when}}',
  'Sent when a booking is cancelled by a doctor or clinic.',
  true,
  '["patientName", "doctorName", "when", "label", "dashboardUrl"]'::jsonb,
  '<div style="font-family:sans-serif;max-width:550px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
    <h2 style="color:#e11d48;margin-top:0;">Appointment Cancelled</h2>
    <p>Hello {{patientName}},</p>
    <p>Your {{label}} scheduled for <strong>{{when}}</strong> with Dr. {{doctorName}} has been cancelled.</p>
    <p style="font-size:13px;color:#475569;">If you had already paid for this session, a refund has been initiated to your original payment method.</p>
    <div style="margin:20px 0;">
      <a href="{{dashboardUrl}}" style="background:#0f172a;color:#fff;padding:10px 20px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:13px;">Book Another Slot</a>
    </div>
  </div>'
),
(
  'doctor_kyc_approved',
  'Doctor KYC Verification Approved',
  'email',
  'Doctor',
  '🎉 Your HealNari Doctor Account is Verified!',
  'Sent to a doctor once admin verifies their medical registration & license.',
  true,
  '["doctorName", "dashboardUrl"]'::jsonb,
  '<div style="font-family:sans-serif;max-width:550px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
    <h2 style="color:#10b981;margin-top:0;">🎉 Welcome to HealNari Practice Network</h2>
    <p>Dear Dr. {{doctorName}},</p>
    <p>We are delighted to inform you that your medical license and practice credentials have been <strong>verified and approved</strong>.</p>
    <p>You can now log in to your provider dashboard, set your consultation hours, and start receiving patient appointments.</p>
    <div style="margin:24px 0;">
      <a href="{{dashboardUrl}}" style="background:#0f172a;color:#fff;padding:10px 20px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:13px;">Go to Doctor Dashboard</a>
    </div>
    <p style="color:#64748b;font-size:12px;">Best regards,<br/>HealNari Clinical Governance Team</p>
  </div>'
),
(
  'doctor_kyc_rejected',
  'Doctor KYC Clarification Request',
  'email',
  'Doctor',
  'Update regarding your HealNari KYC Verification',
  'Sent to a doctor if KYC documents require correction or re-upload.',
  true,
  '["doctorName", "dashboardUrl"]'::jsonb,
  '<div style="font-family:sans-serif;max-width:550px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
    <h2 style="color:#e11d48;margin-top:0;">HealNari KYC Verification Update</h2>
    <p>Dear Dr. {{doctorName}},</p>
    <p>Thank you for submitting your verification details. Our medical compliance team has reviewed your documents and identified items requiring clarification.</p>
    <p>Please log in to your dashboard to review the feedback and re-upload your medical registration certificate.</p>
    <div style="margin:24px 0;">
      <a href="{{dashboardUrl}}" style="background:#0f172a;color:#fff;padding:10px 20px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:13px;">Review KYC Submission</a>
    </div>
    <p style="color:#64748b;font-size:12px;">Best regards,<br/>HealNari Verification Desk</p>
  </div>'
),
(
  'doctor_payout_settlement',
  'Doctor Payout Settlement Advice',
  'email',
  'Doctor',
  'HealNari Payout Settlement Confirmed ({{amount}})',
  'Sent to a doctor when their net consultation earnings are transferred to their bank account.',
  true,
  '["doctorName", "amount", "referenceId", "settlementDate"]'::jsonb,
  '<div style="font-family:sans-serif;max-width:550px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
    <h2 style="color:#0f172a;margin-top:0;">Payment Settlement Advice</h2>
    <p>Dear Dr. {{doctorName}},</p>
    <p>Your net earnings payout has been successfully processed and transferred to your registered bank account.</p>
    <div style="background:#f8fafc;padding:16px;border-radius:8px;margin:16px 0;border:1px solid #e2e8f0;">
      <p style="margin:4px 0;font-size:13px;color:#64748b;">Payout Amount:</p>
      <h3 style="margin:4px 0;color:#10b981;font-size:22px;">{{amount}}</h3>
      <p style="margin:8px 0 0 0;font-size:12px;color:#64748b;">Bank Reference (UTR): <strong>{{referenceId}}</strong></p>
      <p style="margin:4px 0 0 0;font-size:12px;color:#64748b;">Settlement Date: <strong>{{settlementDate}}</strong></p>
    </div>
    <p style="color:#64748b;font-size:12px;">For any billing queries, please contact finance@healnari.com.</p>
  </div>'
),
(
  'doctor_daily_agenda',
  'Doctor Morning Agenda Digest',
  'email',
  'Doctor',
  'Daily Patient Agenda ({{totalPatients}} appointments) - Dr. {{doctorName}}',
  'Sent daily at 7:45 AM to active doctors with their consultation schedule.',
  true,
  '["doctorName", "formattedDate", "totalPatients", "videoCount", "firstTime", "appointmentsTable", "dashboardUrl"]'::jsonb,
  '<div style="font-family:sans-serif;max-width:560px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
    <h2 style="color:#0f172a;margin-top:0;">🌅 Good morning, Dr. {{doctorName}}</h2>
    <p style="color:#475569;font-size:14px;margin-bottom:16px;">Here is your scheduled consultation agenda for <strong>{{formattedDate}}</strong>:</p>
    
    <div style="display:flex;gap:12px;margin-bottom:16px;">
      <div style="background:#f8fafc;padding:12px 16px;border-radius:8px;border:1px solid #e2e8f0;flex:1;">
        <span style="font-size:11px;color:#64748b;display:block;">Total Patients</span>
        <strong style="font-size:18px;color:#0f172a;">{{totalPatients}}</strong>
      </div>
      <div style="background:#f0fdf4;padding:12px 16px;border-radius:8px;border:1px solid #bbf7d0;flex:1;">
        <span style="font-size:11px;color:#166534;display:block;">Video Consults</span>
        <strong style="font-size:18px;color:#15803d;">{{videoCount}}</strong>
      </div>
      <div style="background:#faf5ff;padding:12px 16px;border-radius:8px;border:1px solid #f3e8ff;flex:1;">
        <span style="font-size:11px;color:#7e22ce;display:block;">First Appointment</span>
        <strong style="font-size:18px;color:#6b21a8;">{{firstTime}}</strong>
      </div>
    </div>

    <table style="width:100%;text-align:left;border-collapse:collapse;margin:16px 0;font-size:13px;">
      <thead>
        <tr style="background:#f8fafc;color:#64748b;font-size:11px;text-transform:uppercase;">
          <th style="padding:8px 12px;border-bottom:2px solid #e2e8f0;">Time</th>
          <th style="padding:8px 12px;border-bottom:2px solid #e2e8f0;">Type</th>
          <th style="padding:8px 12px;border-bottom:2px solid #e2e8f0;">Status</th>
        </tr>
      </thead>
      <tbody>
        {{appointmentsTable}}
      </tbody>
    </table>

    <div style="margin:24px 0 12px 0;">
      <a href="{{dashboardUrl}}" style="background:#0f172a;color:#fff;padding:10px 20px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:13px;">Open Doctor Dashboard</a>
    </div>
    <p style="color:#94a3b8;font-size:11px;margin-top:20px;">HealNari Practice Management • Auto-generated daily at 7:45 AM</p>
  </div>'
),
(
  'prescription_refill_reminder',
  'Prescription Refill Warning',
  'email',
  'Patient',
  'Refill Reminder: {{medName}} expiring soon',
  'Sent to patients 5 days before active prescription completion.',
  true,
  '["patientName", "medName", "duration", "recordsUrl"]'::jsonb,
  '<div style="font-family:sans-serif;max-width:550px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
    <h2 style="color:#7e22ce;margin-top:0;">💊 Prescription Refill Reminder</h2>
    <p>Hello {{patientName}},</p>
    <p>This is a friendly reminder that your current course of <strong>{{medName}}</strong> ({{duration}}) is nearing completion within the next 5 days.</p>
    <p>To avoid any disruption in your care plan, please re-order your medication or schedule a brief review with your doctor.</p>
    <div style="margin:20px 0;">
      <a href="{{recordsUrl}}" style="background:#7e22ce;color:#fff;padding:10px 20px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:13px;">View Prescriptions & Refill</a>
    </div>
    <p style="color:#94a3b8;font-size:11px;">HealNari Patient Care Team</p>
  </div>'
),
(
  'admin_daily_revenue_reconciliation',
  'Daily Revenue Settlement Report (Admin)',
  'email',
  'General',
  'HealNari Daily Settlement Report ({{date}})',
  'Sent to administrators at midnight with the 24-hour financial reconciliation breakdown.',
  true,
  '["adminName", "date", "totalGross", "platformCommission", "doctorNetPayouts", "paidCount", "analyticsUrl"]'::jsonb,
  '<div style="font-family:sans-serif;max-width:550px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
    <h2 style="color:#0f172a;margin-top:0;">📊 HealNari 24h Revenue Settlement Report</h2>
    <p>Hello {{adminName}},</p>
    <p>Here is the 24-hour financial reconciliation summary for <strong>{{date}}</strong>:</p>
    <div style="background:#f8fafc;padding:16px;border-radius:8px;border:1px solid #e2e8f0;margin:16px 0;">
      <p style="margin:4px 0;font-size:13px;color:#64748b;">Gross Consultation Volume: <strong style="color:#0f172a;">{{totalGross}}</strong></p>
      <p style="margin:4px 0;font-size:13px;color:#64748b;">Platform Net Commission (15%): <strong style="color:#10b981;">{{platformCommission}}</strong></p>
      <p style="margin:4px 0;font-size:13px;color:#64748b;">Doctor Payout Liabilities: <strong style="color:#0284c7;">{{doctorNetPayouts}}</strong></p>
      <p style="margin:4px 0;font-size:13px;color:#64748b;">Total Paid Consultations: <strong style="color:#0f172a;">{{paidCount}}</strong></p>
    </div>
    <div style="margin-top:20px;">
      <a href="{{analyticsUrl}}" style="background:#0f172a;color:#fff;padding:10px 20px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:13px;">View Revenue Analytics</a>
    </div>
    <p style="color:#94a3b8;font-size:11px;margin-top:20px;">HealNari Financial Operations • Automated Midnight Reconciliation</p>
  </div>'
),
(
  'admin_doctor_kyc_escalation',
  'Doctor KYC Escalation (>48h Overdue)',
  'email',
  'General',
  '⚠️ [Escalation] {{pendingCount}} Doctor KYC Verifications Overdue (>48h)',
  'Sent to admins when doctor licenses are pending review for over 48 hours.',
  true,
  '["adminName", "pendingCount", "doctorListHtml", "verificationsUrl"]'::jsonb,
  '<div style="font-family:sans-serif;max-width:550px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
    <h2 style="color:#e11d48;margin-top:0;">⚠️ Action Required: Doctor KYC Review Escalation</h2>
    <p>Hello {{adminName}},</p>
    <p>There are <strong>{{pendingCount}} doctor verification(s)</strong> that have been pending review for over 48 hours:</p>
    <ul style="color:#334155;font-size:13px;line-height:1.6;">
      {{doctorListHtml}}
    </ul>
    <div style="margin-top:20px;">
      <a href="{{verificationsUrl}}" style="background:#e11d48;color:#fff;padding:10px 20px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:13px;">Review Pending Doctor KYCs</a>
    </div>
  </div>'
)
on conflict (slug) do update set
  subject = excluded.subject,
  description = excluded.description,
  is_system = excluded.is_system,
  variables_hint = excluded.variables_hint,
  content = excluded.content;


-- ==========================================
-- MIGRATION: 0033_clinical_rag_knowledge_base.sql
-- ==========================================

-- Migration 0033: Seed Clinical & Pharmacology Knowledge Base for Vector RAG & Function Calling

-- Ensure pgvector extension and documents table exist
create extension if not exists vector;

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  metadata jsonb default '{}'::jsonb,
  embedding vector(768),
  created_at timestamptz default now()
);

create index if not exists documents_embedding_idx on public.documents using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Enable RLS
alter table public.documents enable row level security;

-- Policy for reading clinical guidelines
create policy "Authenticated users can read clinical documents"
  on public.documents for select
  to authenticated
  using (true);

create policy "Admins can manage documents"
  on public.documents for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Function to search documents by similarity
create or replace function match_documents (
  query_embedding vector(768),
  match_threshold float default 0.6,
  match_count int default 5
)
returns table (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where documents.embedding is not null
    and 1 - (documents.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
$$;


-- ==========================================
-- MIGRATION: 0034_life_stages_and_biomarkers.sql
-- ==========================================

-- ─────────────────────────────────────────────────────────────
-- 0034_life_stages_and_biomarkers.sql
-- Adds multi-modal fertility biomarkers (BBT, LH ratio, Cervical Mucus),
-- life-stage personalization (Cycle, PCOS, TTC, Pregnancy, Menopause),
-- customizable luteal phase, and extends vitals keys in vitals_logs.
-- ─────────────────────────────────────────────────────────────

-- 1. Extend vitals_logs check constraint to allow multi-modal biomarkers
alter table public.vitals_logs drop constraint if exists vitals_logs_vital_key_check;
alter table public.vitals_logs add constraint vitals_logs_vital_key_check 
  check (vital_key in (
    'weight', 'bp', 'sugar', 'sleep', 'hirsutism', 
    'bbt', 'lh', 'hotflashes', 'mfg_score', 
    'systolic', 'diastolic', 'fasting_glucose', 'postprandial_glucose'
  ));

-- 2. Extend cycle_logs with multi-modal biomarker fields
alter table public.cycle_logs 
  add column if not exists bbt numeric(5,2) null,
  add column if not exists lh_ratio numeric(4,2) null,
  add column if not exists cervical_mucus text null check (cervical_mucus in ('Dry', 'Sticky', 'Creamy', 'Egg-White', null)),
  add column if not exists ovulation_test text null check (ovulation_test in ('Low', 'High', 'Peak', null)),
  add column if not exists intercourse boolean null default false;

-- 3. Extend patient_records with life stage modes, regional currency & luteal calibration
alter table public.patient_records
  add column if not exists life_stage_mode text not null default 'cycle' check (life_stage_mode in ('cycle', 'pcos', 'ttc', 'pregnancy', 'menopause')),
  add column if not exists currency_preference text not null default 'INR',
  add column if not exists luteal_phase_days int not null default 14 check (luteal_phase_days between 10 and 16),
  add column if not exists gestational_due_date date null,
  add column if not exists last_mfg_score int null check (last_mfg_score between 0 and 36);

-- 4. Indices for efficient biomarker analysis and timeline queries
create index if not exists cycle_logs_patient_biomarker_idx 
  on public.cycle_logs (patient_id, log_date desc) 
  where bbt is not null or lh_ratio is not null or cervical_mucus is not null;


-- ==========================================
-- MIGRATION: 0035_phi_audit_logs.sql
-- ==========================================

create table if not exists public.phi_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  target_patient_id uuid references public.profiles(id) on delete set null,
  actor_role text not null,
  action text not null,
  resource text not null,
  status text not null,
  ip_address text,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists phi_audit_logs_actor_idx on public.phi_audit_logs (actor_id);
create index if not exists phi_audit_logs_patient_idx on public.phi_audit_logs (target_patient_id);
create index if not exists phi_audit_logs_resource_idx on public.phi_audit_logs (resource);
create index if not exists phi_audit_logs_created_idx on public.phi_audit_logs (created_at desc);

alter table public.phi_audit_logs enable row level security;

do $$ 
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'phi_audit_logs' and policyname = 'phi_audit_logs_select_admin'
  ) then
    create policy "phi_audit_logs_select_admin" on public.phi_audit_logs
      for select to authenticated using (current_app_role() = 'admin');
  end if;
end $$;

do $$ 
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'phi_audit_logs' and policyname = 'phi_audit_logs_select_patient'
  ) then
    create policy "phi_audit_logs_select_patient" on public.phi_audit_logs
      for select to authenticated using (auth.uid() = target_patient_id);
  end if;
end $$;

-- System (service role) writes to it, so no insert policy needed for authenticated users.


-- ==========================================
-- MIGRATION: 0036_soft_deletes.sql
-- ==========================================

-- Add deleted_at soft delete column to clinical and operational tables

alter table public.patient_records add column deleted_at timestamptz default null;
alter table public.cycle_logs add column deleted_at timestamptz default null;
alter table public.vitals_logs add column deleted_at timestamptz default null;
alter table public.lab_reports add column deleted_at timestamptz default null;
alter table public.prescriptions add column deleted_at timestamptz default null;
alter table public.clinical_notes add column deleted_at timestamptz default null;
alter table public.appointments add column deleted_at timestamptz default null;

-- Add indexes on deleted_at for performance
create index patient_records_deleted_idx on public.patient_records (deleted_at);
create index cycle_logs_deleted_idx on public.cycle_logs (deleted_at);
create index vitals_logs_deleted_idx on public.vitals_logs (deleted_at);
create index lab_reports_deleted_idx on public.lab_reports (deleted_at);
create index prescriptions_deleted_idx on public.prescriptions (deleted_at);
create index clinical_notes_deleted_idx on public.clinical_notes (deleted_at);
create index appointments_deleted_idx on public.appointments (deleted_at);


-- ==========================================
-- MIGRATION: 0037_analytics_rpc.sql
-- ==========================================

-- Create Postgres RPCs for optimized backend analytics

-- 1. Doctor Analytics
CREATE OR REPLACE FUNCTION get_doctor_analytics(p_doctor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_revenue numeric;
  v_total_consultations int;
  v_total_patients int;
  v_no_show_rate numeric;
  v_monthly_trend jsonb;
  v_consult_type_split jsonb;
  v_weekly_load jsonb;
  v_age_demographics jsonb;
  v_top_diagnoses jsonb;
  v_appointment_status_split jsonb;
  v_payment_method_split jsonb;
BEGIN
  -- Total Revenue
  SELECT COALESCE(SUM(amount), 0) INTO v_total_revenue
  FROM payments
  WHERE doctor_id = p_doctor_id AND status = 'Paid';

  -- Total Consultations
  SELECT COUNT(*) INTO v_total_consultations
  FROM appointments
  WHERE doctor_id = p_doctor_id AND deleted_at IS NULL;

  -- Total Patients
  SELECT COUNT(DISTINCT patient_id) INTO v_total_patients
  FROM appointments
  WHERE doctor_id = p_doctor_id AND deleted_at IS NULL;

  -- No Show Rate
  SELECT CASE WHEN v_total_consultations > 0 THEN 
    ROUND((COUNT(*)::numeric / v_total_consultations) * 100, 1) 
  ELSE 0 END INTO v_no_show_rate
  FROM appointments
  WHERE doctor_id = p_doctor_id AND status = 'No Show' AND deleted_at IS NULL;

  -- Monthly Trend
  WITH months AS (
    SELECT generate_series(date_trunc('month', now() - interval '11 months'), date_trunc('month', now()), '1 month')::date AS m
  ),
  rev AS (
    SELECT date_trunc('month', created_at)::date AS m, SUM(amount) AS rev
    FROM payments WHERE doctor_id = p_doctor_id AND status = 'Paid' GROUP BY 1
  ),
  con AS (
    SELECT date_trunc('month', scheduled_date)::date AS m, COUNT(*) AS cons
    FROM appointments WHERE doctor_id = p_doctor_id AND deleted_at IS NULL GROUP BY 1
  )
  SELECT jsonb_agg(jsonb_build_object(
    'month', to_char(m.m, 'Mon'),
    'revenue', COALESCE(r.rev, 0),
    'consultations', COALESCE(c.cons, 0)
  )) INTO v_monthly_trend
  FROM months m
  LEFT JOIN rev r ON m.m = r.m
  LEFT JOIN con c ON m.m = c.m;

  -- Consult Type Split
  SELECT jsonb_build_object(
    'video', COUNT(*) FILTER (WHERE type = 'video'),
    'clinic', COUNT(*) FILTER (WHERE type = 'clinic')
  ) INTO v_consult_type_split
  FROM appointments WHERE doctor_id = p_doctor_id AND deleted_at IS NULL;

  -- Weekly Load
  WITH days AS (SELECT unnest(ARRAY['Mon','Tue','Wed','Thu','Fri','Sat','Sun']) AS d, unnest(ARRAY[1,2,3,4,5,6,0]) AS dow)
  SELECT jsonb_agg(jsonb_build_object('day', d.d, 'consultations', COALESCE(a.c, 0))) INTO v_weekly_load
  FROM days d
  LEFT JOIN (
    SELECT extract(dow from scheduled_date) as dow, COUNT(*) as c
    FROM appointments WHERE doctor_id = p_doctor_id AND deleted_at IS NULL GROUP BY 1
  ) a ON d.dow = a.dow;

  -- Age Demographics
  WITH ages AS (
    SELECT 
      CASE
        WHEN age(dob) <= interval '25 years' THEN '18-25'
        WHEN age(dob) <= interval '35 years' THEN '26-35'
        WHEN age(dob) <= interval '45 years' THEN '36-45'
        WHEN age(dob) <= interval '55 years' THEN '46-55'
        ELSE '56+'
      END as age_bucket
    FROM patient_records
    WHERE patient_id IN (SELECT DISTINCT patient_id FROM appointments WHERE doctor_id = p_doctor_id AND deleted_at IS NULL)
      AND dob IS NOT NULL AND deleted_at IS NULL
  ),
  buckets AS (SELECT unnest(ARRAY['18-25','26-35','36-45','46-55','56+']) AS bucket)
  SELECT jsonb_agg(jsonb_build_object('age', b.bucket, 'count', COALESCE(a.c, 0))) INTO v_age_demographics
  FROM buckets b
  LEFT JOIN (SELECT age_bucket, COUNT(*) as c FROM ages GROUP BY 1) a ON b.bucket = a.age_bucket;

  -- Top Diagnoses
  WITH conds AS (
    SELECT unnest(chronic_conditions) AS condition
    FROM patient_records
    WHERE patient_id IN (SELECT DISTINCT patient_id FROM appointments WHERE doctor_id = p_doctor_id AND deleted_at IS NULL)
      AND chronic_conditions IS NOT NULL AND deleted_at IS NULL
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object('condition', condition, 'count', c)), '[]'::jsonb) INTO v_top_diagnoses
  FROM (SELECT condition, COUNT(*) as c FROM conds GROUP BY 1 ORDER BY 2 DESC LIMIT 6) sq;

  -- Appointment Status Split
  SELECT jsonb_build_object(
    'Completed', COUNT(*) FILTER (WHERE status = 'Done'),
    'Scheduled', COUNT(*) FILTER (WHERE status IN ('Upcoming', 'Waiting')),
    'Cancelled', COUNT(*) FILTER (WHERE status = 'Cancelled'),
    'NoShow', COUNT(*) FILTER (WHERE status = 'No Show')
  ) INTO v_appointment_status_split
  FROM appointments WHERE doctor_id = p_doctor_id AND deleted_at IS NULL;

  -- Payment Method Split
  SELECT jsonb_build_object(
    'UPI', COALESCE(SUM(amount) FILTER (WHERE method = 'UPI'), 0),
    'Card', COALESCE(SUM(amount) FILTER (WHERE method = 'Card'), 0),
    'Cash', COALESCE(SUM(amount) FILTER (WHERE method = 'Cash'), 0)
  ) INTO v_payment_method_split
  FROM payments WHERE doctor_id = p_doctor_id AND status = 'Paid';

  RETURN jsonb_build_object(
    'totalRevenue', v_total_revenue,
    'totalConsultations', v_total_consultations,
    'totalPatients', v_total_patients,
    'noShowRate', v_no_show_rate,
    'monthlyTrend', COALESCE(v_monthly_trend, '[]'::jsonb),
    'consultTypeSplit', v_consult_type_split,
    'weeklyLoad', COALESCE(v_weekly_load, '[]'::jsonb),
    'ageDemographics', COALESCE(v_age_demographics, '[]'::jsonb),
    'topDiagnoses', COALESCE(v_top_diagnoses, '[]'::jsonb),
    'appointmentStatusSplit', v_appointment_status_split,
    'paymentMethodSplit', v_payment_method_split
  );
END;
$$;


-- 2. Admin Analytics
CREATE OR REPLACE FUNCTION get_admin_analytics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_financial_data jsonb;
  v_revenue_by_currency jsonb;
  v_geographic_distribution jsonb;
  v_cross_border jsonb;
  v_specialty_revenue jsonb;
  v_total_doctors int;
  v_total_patients int;
  v_status_breakdown jsonb;
  v_consult_type_split jsonb;
BEGIN
  -- Total Docs / Patients
  SELECT COUNT(*) INTO v_total_doctors FROM profiles WHERE role = 'doctor';
  SELECT COUNT(*) INTO v_total_patients FROM profiles WHERE role = 'patient';

  -- Financial Data (monthly)
  WITH months AS (
    SELECT generate_series(date_trunc('month', now() - interval '11 months'), date_trunc('month', now()), '1 month')::date AS m
  ),
  completed_apts AS (
    SELECT a.scheduled_date, p.consultation_fee
    FROM appointments a
    JOIN profiles p ON a.doctor_id = p.id
    WHERE a.status = 'Done' AND a.deleted_at IS NULL
  ),
  rev AS (
    SELECT date_trunc('month', scheduled_date)::date AS m, SUM(consultation_fee) AS rev
    FROM completed_apts GROUP BY 1
  ),
  cumul_pat AS (
    SELECT m, (SELECT COUNT(*) FROM profiles WHERE role = 'patient' AND created_at < m + interval '1 month') as patients
    FROM months
  ),
  cumul_doc AS (
    SELECT m, (SELECT COUNT(*) FROM profiles WHERE role = 'doctor' AND created_at < m + interval '1 month') as doctors
    FROM months
  )
  SELECT jsonb_agg(jsonb_build_object(
    'name', to_char(m.m, 'Mon'),
    'revenue', COALESCE(r.rev, 0),
    'payout', ROUND(COALESCE(r.rev, 0) * 0.90),
    'margin', COALESCE(r.rev, 0) - ROUND(COALESCE(r.rev, 0) * 0.90),
    'patients', p.patients,
    'doctors', d.doctors
  )) INTO v_financial_data
  FROM months m
  LEFT JOIN rev r ON m.m = r.m
  LEFT JOIN cumul_pat p ON m.m = p.m
  LEFT JOIN cumul_doc d ON m.m = d.m;

  -- Revenue by Currency
  WITH curr_meta(currency, name, symbol, flag) AS (
    VALUES
      ('USD', 'US Dollar', '$', '🇺🇸'),
      ('GBP', 'British Pound', '£', '🇬🇧'),
      ('AED', 'UAE Dirham', 'AED', '🇦🇪'),
      ('EUR', 'Euro', '€', '🇪🇺'),
      ('INR', 'Indian Rupee', '₹', '🇮🇳'),
      ('CAD', 'Canadian Dollar', 'CA$', '🇨🇦'),
      ('AUD', 'Australian Dollar', 'A$', '🇦🇺')
  ),
  agg AS (
    SELECT COALESCE(currency, 'USD') as curr, COUNT(*) as count, SUM(amount) as amount
    FROM payments WHERE status = 'Paid' GROUP BY 1
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'currency', a.curr,
    'name', COALESCE(cm.name, a.curr),
    'symbol', COALESCE(cm.symbol, a.curr),
    'flag', COALESCE(cm.flag, '🌍'),
    'amount', a.amount,
    'count', a.count
  )), '[]'::jsonb) INTO v_revenue_by_currency
  FROM agg a LEFT JOIN curr_meta cm ON a.curr = cm.currency;

  -- Geographic Distribution
  WITH c_meta(code, name, flag) AS (
    VALUES
      ('US', 'United States', '🇺🇸'),
      ('GB', 'United Kingdom', '🇬🇧'),
      ('AE', 'United Arab Emirates', '🇦🇪'),
      ('IN', 'India', '🇮🇳'),
      ('CA', 'Canada', '🇨🇦'),
      ('AU', 'Australia', '🇦🇺'),
      ('EU', 'European Union', '🇪🇺'),
      ('GLOBAL', 'Other International', '🌍')
  ),
  pat AS (
    SELECT COALESCE(country, 'US') as code, COUNT(*) as count
    FROM profiles WHERE role = 'patient' GROUP BY 1
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'code', p.code,
    'name', COALESCE(cm.name, p.code),
    'flag', COALESCE(cm.flag, '🌍'),
    'patientCount', p.count,
    'percentage', CASE WHEN v_total_patients > 0 THEN ROUND((p.count::numeric / v_total_patients) * 100) ELSE 0 END
  )), '[]'::jsonb) INTO v_geographic_distribution
  FROM pat p LEFT JOIN c_meta cm ON p.code = cm.code;

  -- Cross Border
  SELECT jsonb_build_object(
    'international', COUNT(*) FILTER (WHERE COALESCE(country, 'US') != 'IN'),
    'domestic', COUNT(*) FILTER (WHERE COALESCE(country, 'US') = 'IN'),
    'internationalPercentage', CASE WHEN v_total_patients > 0 THEN ROUND((COUNT(*) FILTER (WHERE COALESCE(country, 'US') != 'IN')::numeric / v_total_patients) * 100) ELSE 0 END
  ) INTO v_cross_border
  FROM profiles WHERE role = 'patient';

  -- Specialty Revenue
  WITH colors(id, c) AS (
    VALUES (0, '#6B46C1'), (1, '#10b981'), (2, '#0ea5e9'), (3, '#f59e0b'), (4, '#f43f5e'), (5, '#8b5cf6'), (6, '#06b6d4')
  ),
  spec AS (
    SELECT COALESCE(p.specialty, 'General') as specialty, SUM(p.consultation_fee) as rev
    FROM appointments a
    JOIN profiles p ON a.doctor_id = p.id
    WHERE a.status = 'Done' AND a.deleted_at IS NULL
    GROUP BY 1
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'name', s.specialty,
    'value', s.rev,
    'color', c.c
  )), '[]'::jsonb) INTO v_specialty_revenue
  FROM (SELECT specialty, rev, row_number() over() - 1 as rn FROM spec) s
  JOIN colors c ON MOD(s.rn, 7) = c.id;

  -- Appt Status Breakdown
  SELECT COALESCE(jsonb_agg(jsonb_build_object('status', status, 'count', c)), '[]'::jsonb) INTO v_status_breakdown
  FROM (SELECT status, COUNT(*) as c FROM appointments WHERE deleted_at IS NULL GROUP BY 1) sq;

  -- Consult Type Split
  SELECT jsonb_build_object(
    'video', COUNT(*) FILTER (WHERE type = 'video'),
    'clinic', COUNT(*) FILTER (WHERE type = 'clinic')
  ) INTO v_consult_type_split
  FROM appointments WHERE deleted_at IS NULL;

  -- Return
  RETURN jsonb_build_object(
    'financialData', COALESCE(v_financial_data, '[]'::jsonb),
    'revenueByCurrency', COALESCE(v_revenue_by_currency, '[]'::jsonb),
    'geographicDistribution', COALESCE(v_geographic_distribution, '[]'::jsonb),
    'crossBorderSplit', v_cross_border,
    'specialtyRevenue', COALESCE(v_specialty_revenue, '[]'::jsonb),
    'totalDoctors', v_total_doctors,
    'totalPatients', v_total_patients,
    'appointmentStatusBreakdown', COALESCE(v_status_breakdown, '[]'::jsonb),
    'consultTypeSplit', v_consult_type_split
  );
END;
$$;


-- ==========================================
-- MIGRATION: 0038_dashboard_rpc.sql
-- ==========================================

-- 1. Doctor Patients List (Optimizes patients.service.ts N+1)
CREATE OR REPLACE FUNCTION get_doctor_patients(p_doctor_id uuid)
RETURNS TABLE (
  profile jsonb,
  record jsonb,
  prescriptions jsonb,
  lab_reports jsonb,
  clinical_notes jsonb,
  payments jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH doc_patients AS (
    SELECT patient_id FROM appointments WHERE doctor_id = p_doctor_id AND deleted_at IS NULL
    UNION
    SELECT patient_id FROM patient_records WHERE created_by_doctor_id = p_doctor_id AND deleted_at IS NULL
  )
  SELECT 
    to_jsonb(p.*) as profile,
    to_jsonb(r.*) as record,
    COALESCE((SELECT jsonb_agg(to_jsonb(pr.*)) FROM prescriptions pr WHERE pr.patient_id = dp.patient_id AND pr.deleted_at IS NULL), '[]'::jsonb) as prescriptions,
    COALESCE((SELECT jsonb_agg(to_jsonb(lr.*)) FROM lab_reports lr WHERE lr.patient_id = dp.patient_id AND lr.deleted_at IS NULL), '[]'::jsonb) as lab_reports,
    COALESCE((SELECT jsonb_agg(to_jsonb(cn.*)) FROM clinical_notes cn WHERE cn.patient_id = dp.patient_id AND cn.deleted_at IS NULL), '[]'::jsonb) as clinical_notes,
    COALESCE((SELECT jsonb_agg(to_jsonb(py.*)) FROM payments py WHERE py.patient_id = dp.patient_id), '[]'::jsonb) as payments
  FROM doc_patients dp
  JOIN profiles p ON p.id = dp.patient_id
  LEFT JOIN patient_records r ON r.patient_id = dp.patient_id AND r.deleted_at IS NULL
  WHERE p.role = 'patient';
END;
$$;

-- 2. Admin Dashboard Revenue (Optimizes admin.service.ts dashboard stats)
CREATE OR REPLACE FUNCTION get_dashboard_revenue()
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_revenue numeric;
BEGIN
  SELECT COALESCE(SUM(p.consultation_fee), 0) INTO v_revenue
  FROM appointments a
  JOIN profiles p ON a.doctor_id = p.id
  WHERE a.status = 'Done' AND a.deleted_at IS NULL;
  
  RETURN v_revenue;
END;
$$;


-- ==========================================
-- MIGRATION: 0039_appointment_double_booking_soft_delete.sql
-- ==========================================

-- Recreate the appointments_no_double_booking index to account for soft deletes.
-- If an appointment was soft-deleted (deleted_at IS NOT NULL), it should not block
-- a new appointment from being booked in the same slot.

drop index if exists appointments_no_double_booking;

create unique index appointments_no_double_booking
  on public.appointments (doctor_id, scheduled_date, scheduled_time)
  where status not in ('Cancelled', 'No Show') and deleted_at is null;


-- ==========================================
-- MIGRATION: 0040_lab_reports_rpc.sql
-- ==========================================

-- Optimizes the lab reports queue for doctors by performing the patient_id join in the database.
-- Previously, the backend fetched all patient IDs for a doctor into Node.js memory
-- and then sent them back via a massive `WHERE patient_id IN (...)` clause.

CREATE OR REPLACE FUNCTION get_doctor_lab_reports(p_doctor_id uuid)
RETURNS SETOF lab_reports
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT lr.* 
  FROM lab_reports lr
  WHERE lr.deleted_at IS NULL
  AND lr.patient_id IN (
    SELECT patient_id FROM appointments WHERE doctor_id = p_doctor_id AND deleted_at IS NULL
    UNION
    SELECT patient_id FROM patient_records WHERE created_by_doctor_id = p_doctor_id AND deleted_at IS NULL
  )
  ORDER BY lr.created_at DESC;
END;
$$;


-- ==========================================
-- MIGRATION: 0041_clinical_catalog.sql
-- ==========================================

-- Migration 0041: Comprehensive Clinical Catalog for Women's Health (250+ Categorized Medicines & Lab Tests)

create table if not exists public.clinical_catalog (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('medicine', 'lab_test')),
  doctor_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  category text not null,
  default_dose text,
  default_freq text,
  default_timing text,
  default_duration text,
  badge text,
  instructions text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists clinical_catalog_type_doctor_idx on public.clinical_catalog (type, doctor_id) where deleted_at is null;
create index if not exists clinical_catalog_category_idx on public.clinical_catalog (category) where deleted_at is null;
create index if not exists clinical_catalog_name_idx on public.clinical_catalog (name) where deleted_at is null;

-- Enable RLS
alter table public.clinical_catalog enable row level security;

-- Policies:
create policy "Users can view global or own catalog items"
  on public.clinical_catalog
  for select
  using (
    deleted_at is null and (
      doctor_id is null or
      doctor_id = auth.uid() or
      exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    )
  );

create policy "Doctors and Admins can create catalog items"
  on public.clinical_catalog
  for insert
  with check (
    (doctor_id = auth.uid()) or
    (doctor_id is null and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  );

create policy "Doctors and Admins can update catalog items"
  on public.clinical_catalog
  for update
  using (
    doctor_id = auth.uid() or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Doctors and Admins can delete catalog items"
  on public.clinical_catalog
  for delete
  using (
    doctor_id = auth.uid() or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ==============================================================================
-- 💊 1. GLOBAL MEDICINES CATALOG (ORGANIZED BY CLINICAL CATEGORY)
-- ==============================================================================

insert into public.clinical_catalog (type, doctor_id, name, category, default_dose, default_freq, default_timing, default_duration, badge, instructions)
values
  -- ─── 1. PCOS & Metabolic Health ───
  ('medicine', null, 'Metformin ER 500mg', 'PCOS & Metabolic Health', '500mg', '1-0-1', 'After Food', '90 Days', 'PCOS / IR', 'Take with or after main meals to minimize GI distress'),
  ('medicine', null, 'Metformin ER 850mg', 'PCOS & Metabolic Health', '850mg', '1-0-1', 'After Meals', '90 Days', 'PCOS / IR', 'Titrate dosage as advised'),
  ('medicine', null, 'Metformin ER 1000mg', 'PCOS & Metabolic Health', '1000mg', '1-0-1', 'After Meals', '90 Days', 'PCOS / IR', 'Extended release formulation'),
  ('medicine', null, 'Myo-Inositol & D-Chiro Inositol (40:1) Sachet', 'PCOS & Metabolic Health', '2g', '1-0-0', 'Morning with water', '90 Days', 'Ovulation & Oocyte', 'Dissolve 1 sachet in a glass of water'),
  ('medicine', null, 'Myo-Inositol + Melatonin + Folic Acid', 'PCOS & Metabolic Health', '1 Sachet', '0-0-1', 'Bedtime with water', '90 Days', 'Sleep & Oocyte Quality', 'Improves sleep and egg quality in PCOS'),
  ('medicine', null, 'Berberine HCl 500mg', 'PCOS & Metabolic Health', '500mg', '1-0-1', 'Before Food (20 mins)', '60 Days', 'Insulin & Lipid Control', 'Natural insulin sensitizer'),
  ('medicine', null, 'N-Acetylcysteine (NAC) 600mg', 'PCOS & Metabolic Health', '600mg', '1-0-1', 'After Food', '60 Days', 'Antioxidant / PCOS', 'Supports ovarian follicle health and reduces androgen levels'),
  ('medicine', null, 'Alpha Lipoic Acid 300mg', 'PCOS & Metabolic Health', '300mg', '1-0-0', 'Empty Stomach', '60 Days', 'Metabolic Antioxidant', 'Take 30 mins before morning breakfast'),
  ('medicine', null, 'Chromium Picolinate 200mcg', 'PCOS & Metabolic Health', '200mcg', '1-0-0', 'After Breakfast', '90 Days', 'Glucose Metabolism', 'Aids carbohydrate metabolism and reduces sugar cravings'),
  ('medicine', null, 'Spironolactone 25mg', 'PCOS & Metabolic Health', '25mg', '1-0-0', 'After Food (Morning)', '90 Days', 'Hirsutism / Acne', 'Requires baseline serum potassium check'),
  ('medicine', null, 'Spironolactone 50mg', 'PCOS & Metabolic Health', '50mg', '1-0-0', 'After Food (Morning)', '90 Days', 'Hirsutism / Acne', 'Monitor blood pressure and electrolytes'),
  ('medicine', null, 'Spironolactone 100mg', 'PCOS & Metabolic Health', '100mg', '1-0-0', 'After Food (Morning)', '90 Days', 'Severe Hirsutism', 'Ensure reliable contraception during therapy'),
  ('medicine', null, 'Cyproterone Acetate 2mg + Ethinylestradiol 0.035mg', 'PCOS & Metabolic Health', '1 Tab', '0-0-1', 'Fixed time night', '21 Days', 'PCOS / Hyperandrogenism', 'Take daily for 21 days followed by 7-day pill-free interval'),
  ('medicine', null, 'Drospirenone 3mg + Ethinylestradiol 0.03mg', 'PCOS & Metabolic Health', '1 Tab', '0-0-1', 'Fixed time night', '21 Days', 'PCOS / Acne', 'Low water retention profile'),
  ('medicine', null, 'Drospirenone 3mg + Ethinylestradiol 0.02mg (24/4 Regimen)', 'PCOS & Metabolic Health', '1 Tab', '0-0-1', 'Fixed time night', '28 Days', 'PCOS / PMDD', '24 active pills + 4 inactive placebo pills'),
  ('medicine', null, 'Coenzyme Q10 (Ubiquinol) 100mg', 'PCOS & Metabolic Health', '100mg', '1-0-0', 'After Breakfast', '90 Days', 'Oocyte Health', 'Lipid-soluble antioxidant for mitochondrial energy'),
  ('medicine', null, 'Coenzyme Q10 (Ubiquinol) 200mg', 'PCOS & Metabolic Health', '200mg', '1-0-0', 'After Breakfast', '90 Days', 'Advanced Oocyte Support', 'For advanced maternal age / diminished reserve'),

  -- ─── 2. Progestins & Cycle Regulators ───
  ('medicine', null, 'Norethisterone 5mg', 'Progestins & Cycle Regulators', '5mg', '1-0-1', 'After Food', '10 Days', 'Cycle Regulation', 'Withdrawal bleed usually occurs 3-5 days after stopping'),
  ('medicine', null, 'Norethisterone Controlled Release 10mg (CR)', 'Progestins & Cycle Regulators', '10mg', '1-0-0', 'After Food', '20 Days', 'Menorrhagia / DUB', 'Continuous release formulation'),
  ('medicine', null, 'Norethisterone Controlled Release 15mg (CR)', 'Progestins & Cycle Regulators', '15mg', '1-0-0', 'After Food', '20 Days', 'Severe DUB', 'Take whole with water'),
  ('medicine', null, 'Medroxyprogesterone Acetate 10mg', 'Progestins & Cycle Regulators', '10mg', '0-0-1', 'Bedtime', '10 Days', 'Secondary Amenorrhea', 'Withdrawal bleed expected within 7 days post-treatment'),
  ('medicine', null, 'Medroxyprogesterone Acetate 5mg', 'Progestins & Cycle Regulators', '5mg', '0-0-1', 'Bedtime', '10 Days', 'Cycle Inducer', 'Mild progestational support'),
  ('medicine', null, 'Micronized Natural Progesterone (Oral/Vaginal) 100mg', 'Progestins & Cycle Regulators', '100mg', '0-0-1', 'Bedtime', '15 Days', 'Bioidentical Support', 'Take at bedtime (mild sedative effect if taken orally)'),
  ('medicine', null, 'Micronized Natural Progesterone (Oral/Vaginal) 200mg', 'Progestins & Cycle Regulators', '200mg', '0-0-1', 'Bedtime / Vaginal', '15 Days', 'Luteal Support / Preterm Prevention', 'Can be inserted deeply vaginally or taken orally at night'),
  ('medicine', null, 'Micronized Natural Progesterone (Oral/Vaginal) 300mg SR', 'Progestins & Cycle Regulators', '300mg', '0-0-1', 'Bedtime', '15 Days', 'Sustained Luteal Support', 'Sustained release formulation'),
  ('medicine', null, 'Micronized Natural Progesterone (Oral/Vaginal) 400mg SR', 'Progestins & Cycle Regulators', '400mg', '0-0-1', 'Bedtime', '15 Days', 'High-Dose Luteal Support', 'Used in IVF/ART cycles'),
  ('medicine', null, 'Progesterone 8% Vaginal Gel (Crinone)', 'Progestins & Cycle Regulators', '90mg/appl', '1-0-0', 'Morning Vaginal', '15 Days', 'Targeted Luteal Support', 'Single-use prefilled applicator inserted daily'),
  ('medicine', null, 'Dydrogesterone 10mg', 'Progestins & Cycle Regulators', '10mg', '1-0-1', 'After Food (Day 16-25)', '10 Days', 'Retro-Progesterone / Threat. Ab', 'Selective progestin without androgenic or glucocorticoid activity'),
  ('medicine', null, 'Dydrogesterone 10mg (TDS in Threat. Ab)', 'Progestins & Cycle Regulators', '10mg', '1-1-1', 'After Food', '14 Days', 'Threatened Miscarriage', 'Continue until bleeding ceases completely'),
  ('medicine', null, 'Hydroxyprogesterone Caproate 250mg IM Depot', 'Progestins & Cycle Regulators', '250mg', 'Once Weekly', 'Intramuscular Deep Gluteal', '8 Weeks', 'Preterm Labor Prevention', 'For singleton pregnancy with history of spontaneous preterm birth'),
  ('medicine', null, 'Hydroxyprogesterone Caproate 500mg IM Depot', 'Progestins & Cycle Regulators', '500mg', 'Once Weekly', 'Intramuscular Deep Gluteal', '8 Weeks', 'High-Risk Preterm Prevention', 'Administer strictly via deep IM injection in upper outer quadrant'),
  ('medicine', null, 'Megestrol Acetate 40mg', 'Progestins & Cycle Regulators', '40mg', '1-0-0', 'After Food', '30 Days', 'Endometrial Hyperplasia', 'Potent progestational therapy'),
  ('medicine', null, 'Ormeloxifene (Centchroman) 30mg', 'Progestins & Cycle Regulators', '30mg', 'Twice Weekly', 'After Food (Sun & Wed)', '12 Weeks', 'DUB / Non-hormonal Regimen', 'Twice weekly for 12 weeks, then once weekly thereafter'),
  ('medicine', null, 'Ormeloxifene (Centchroman) 60mg', 'Progestins & Cycle Regulators', '60mg', 'Twice Weekly', 'After Food (Sun & Wed)', '12 Weeks', 'AUB-E / DUB', 'Selective estrogen receptor modulator'),

  -- ─── 3. Ovulation Induction & Fertility ───
  ('medicine', null, 'Clomiphene Citrate 50mg', 'Ovulation Induction & Fertility', '50mg', '0-0-1', 'Night (Day 2 to Day 6)', '5 Days', 'Ovulation Induction', 'Initiate on Day 2 or Day 3 of menstrual cycle'),
  ('medicine', null, 'Clomiphene Citrate 100mg', 'Ovulation Induction & Fertility', '100mg', '0-0-1', 'Night (Day 2 to Day 6)', '5 Days', 'Ovulation Induction Step-Up', 'Monitor follicular development by serial TVS'),
  ('medicine', null, 'Letrozole 2.5mg', 'Ovulation Induction & Fertility', '2.5mg', '0-0-1', 'Night (Day 2 to Day 6)', '5 Days', 'Aromatase Inhibitor / PCOS', 'First-line ovulation induction agent for PCOS'),
  ('medicine', null, 'Letrozole 5mg', 'Ovulation Induction & Fertility', '5mg', '0-0-1', 'Night (Day 2 to Day 6)', '5 Days', 'Aromatase Inhibitor Step-Up', 'Higher dose for resistant PCOS ovaries'),
  ('medicine', null, 'Recombinant FSH (rFSH) 75 IU Inj', 'Ovulation Induction & Fertility', '75 IU', 'Once Daily (SC)', 'Evening (Day 3-10)', '7 Days', 'Controlled Ovarian Stimulation', 'Subcutaneous injection into lower abdomen'),
  ('medicine', null, 'Human Menopausal Gonadotropin (hMG) 150 IU Inj', 'Ovulation Induction & Fertility', '150 IU', 'Once Daily (IM/SC)', 'Evening', '7 Days', 'Gonadotropin Therapy', 'Contains equal FSH and LH activity'),
  ('medicine', null, 'Human Chorionic Gonadotropin (hCG) 5000 IU Inj', 'Ovulation Induction & Fertility', '5000 IU', 'Single Dose (IM/SC)', 'Trigger time as advised', '1 Day', 'Ovulation Trigger', 'Administer when lead follicle reaches 18-20mm'),
  ('medicine', null, 'Human Chorionic Gonadotropin (hCG) 10000 IU Inj', 'Ovulation Induction & Fertility', '10000 IU', 'Single Dose (IM/SC)', 'Trigger time as advised', '1 Day', 'IVF Oocyte Trigger', 'Timed trigger 34-36h before oocyte retrieval'),
  ('medicine', null, 'Recombinant hCG (Choriogonadotropin Alfa 250mcg)', 'Ovulation Induction & Fertility', '250mcg', 'Single Dose (SC)', 'Trigger time as advised', '1 Day', 'Recombinant Trigger', 'Prefilled pen for self-administration'),
  ('medicine', null, 'Cetrorelix 0.25mg Inj', 'Ovulation Induction & Fertility', '0.25mg', 'Once Daily (SC)', 'Morning', '5 Days', 'GnRH Antagonist', 'Prevents premature LH surge during stimulation'),
  ('medicine', null, 'Ganirelix 0.25mg Inj', 'Ovulation Induction & Fertility', '0.25mg', 'Once Daily (SC)', 'Morning', '5 Days', 'GnRH Antagonist', 'Prefilled syringe for subcutaneous administration'),
  ('medicine', null, 'Cabergoline 0.5mg', 'Ovulation Induction & Fertility', '0.5mg', 'Twice Weekly', 'With Food at Bedtime', '8 Weeks', 'Hyperprolactinemia', 'Take with light snack to avoid nausea/dizziness'),
  ('medicine', null, 'Bromocriptine 2.5mg', 'Ovulation Induction & Fertility', '2.5mg', '1-0-1', 'With Meals', '60 Days', 'Dopamine Agonist', 'Preferred in pregnancy wishing for hyperprolactinemia'),
  ('medicine', null, 'Dehydroepiandrosterone (DHEA) 25mg', 'Ovulation Induction & Fertility', '25mg', '1-1-1', 'After Meals', '90 Days', 'Diminished Ovarian Reserve', 'Supports follicular recruitment in poor ovarian responders'),
  ('medicine', null, 'L-Arginine 3g + Zinc + Proanthocyanidins Sachet', 'Ovulation Induction & Fertility', '1 Sachet', '1-0-1', 'With water after food', '30 Days', 'Uterine Perfusion / Lining', 'Enhances endometrial blood flow and thickness'),
  ('medicine', null, 'Sildenafil Citrate 25mg Vaginal Tablet', 'Ovulation Induction & Fertility', '25mg', '1-0-1 (Vaginal)', 'Deep Vaginal', '10 Days', 'Thin Endometrium', 'Vasodilator to improve uterine radial artery blood flow'),

  -- ─── 4. Endometriosis & Pelvic Pain ───
  ('medicine', null, 'Dienogest 2mg', 'Endometriosis & Pelvic Pain', '2mg', '0-0-1', 'Fixed time night', '90 Days', 'Endometriosis / Pelvic Pain', 'Take continuously without pill-free intervals'),
  ('medicine', null, 'Tranexamic Acid 500mg', 'Endometriosis & Pelvic Pain', '500mg', '1-1-1', 'During Heavy Flow', '4 Days', 'Menorrhagia / Heavy Flow', 'Take only during active bleeding days; do not take prophylactically'),
  ('medicine', null, 'Tranexamic Acid 500mg + Mefenamic Acid 250mg', 'Endometriosis & Pelvic Pain', '1 Tab', '1-1-1', 'After Food during Heavy Pain/Flow', '4 Days', 'Heavy Bleeding + Cramps', 'Dual action anti-fibrinolytic + NSAID'),
  ('medicine', null, 'Mefenamic Acid 500mg', 'Endometriosis & Pelvic Pain', '500mg', '1-1-1', 'After Food (SOS Pain)', '5 Days', 'Primary Dysmenorrhea', 'Take at onset of cramps with food or milk'),
  ('medicine', null, 'Drotaverine HCl 80mg', 'Endometriosis & Pelvic Pain', '80mg', '1-0-1', 'After Food (SOS Cramps)', '5 Days', 'Smooth Muscle Spasms', 'Non-anticholinergic antispasmodic for uterine colic'),
  ('medicine', null, 'Drotaverine 80mg + Mefenamic Acid 250mg', 'Endometriosis & Pelvic Pain', '1 Tab', '1-0-1', 'After Food', '5 Days', 'Severe Dysmenorrhea', 'Potent dual relief for acute uterine cramps'),
  ('medicine', null, 'Dicyclomine HCl 20mg + Paracetamol 500mg', 'Endometriosis & Pelvic Pain', '1 Tab', '1-0-1', 'After Food (SOS)', '5 Days', 'Pelvic Spasms', 'Antispasmodic and analgesic combination'),
  ('medicine', null, 'Hyoscine Butylbromide 10mg (Buscopan)', 'Endometriosis & Pelvic Pain', '10mg', '1-1-1', 'Before Food (SOS)', '5 Days', 'Spasmodic Pain', 'Targeted visceral antispasmodic'),
  ('medicine', null, 'Goserelin 3.6mg Depot (Zoladex)', 'Endometriosis & Pelvic Pain', '3.6mg', 'Monthly Depot (SC)', 'Anterior Abdominal Wall', '3 Months', 'Severe Endometriosis / Fibroids', 'Monthly GnRH agonist implant with add-back HRT'),
  ('medicine', null, 'Leuprolide Acetate 3.75mg Depot', 'Endometriosis & Pelvic Pain', '3.75mg', 'Monthly (IM/SC)', 'Intramuscular', '3 Months', 'Endometriosis / Uterine Fibroids', 'Consider add-back tibolone or low-dose estrogen/progesterone'),
  ('medicine', null, 'Triptorelin 3.75mg Depot', 'Endometriosis & Pelvic Pain', '3.75mg', 'Monthly (IM)', 'Deep IM Gluteal', '3 Months', 'GnRH Agonist Depot', 'Down-regulates pituitary gonadotropin secretion'),
  ('medicine', null, 'Ulipristal Acetate 5mg', 'Endometriosis & Pelvic Pain', '5mg', '1-0-0', 'With or without food', '90 Days', 'Uterine Fibroids Pre-op', 'Selective progesterone receptor modulator; monitor LFT'),
  ('medicine', null, 'Danazol 100mg', 'Endometriosis & Pelvic Pain', '100mg', '1-0-1', 'After Food', '90 Days', 'Refractory Endometriosis', 'Synthetic androgen; monitor lipid and liver profiles'),

  -- ─── 5. Contraception & Family Planning ───
  ('medicine', null, 'Desogestrel 0.15mg + Ethinylestradiol 0.03mg', 'Contraception & Family Planning', '1 Tab', '0-0-1', 'Fixed time night', '21 Days', 'Cycle Control', 'Minimal androgenic side effects'),
  ('medicine', null, 'Desogestrel 0.15mg + Ethinylestradiol 0.02mg', 'Contraception & Family Planning', '1 Tab', '0-0-1', 'Fixed time night', '21 Days', 'Ultra-Low Dose OC', 'Low estrogen dosage'),
  ('medicine', null, 'Levonorgestrel 0.15mg + Ethinylestradiol 0.03mg (Mala-D/Novel)', 'Contraception & Family Planning', '1 Tab', '0-0-1', 'Fixed time night', '28 Days', 'Standard Oral Contraceptive', '21 hormone pills + 7 ferrous fumarate spacer pills'),
  ('medicine', null, 'Desogestrel 75mcg (Cerazette / POP)', 'Contraception & Family Planning', '75mcg', '0-0-1', 'Fixed time daily (Exact)', '28 Days', 'Progestin-Only / Lactating', 'Safe for breastfeeding mothers and estrogen-contraindicated women'),
  ('medicine', null, 'Levonorgestrel 1.5mg (I-Pill / Emergency Pill)', 'Contraception & Family Planning', '1.5mg', 'Single Dose', 'Immediate (Within 72h)', '1 Day', 'Emergency Contraceptive', 'Take as early as possible within 72 hours of unprotected intercourse'),
  ('medicine', null, 'Ulipristal Acetate 30mg (Ella / Emergency)', 'Contraception & Family Planning', '30mg', 'Single Dose', 'Immediate (Within 120h)', '1 Day', 'Advanced Emergency Contraceptive', 'Effective up to 120 hours (5 days) post-intercourse'),
  ('medicine', null, 'Depot Medroxyprogesterone Acetate (DMPA 150mg / Antara)', 'Contraception & Family Planning', '150mg', 'Every 3 Months', 'Deep IM Gluteal/Deltoid', '1 Dose', 'Injectable Contraceptive', 'Next dose due in exactly 12-13 weeks'),
  ('medicine', null, 'Norelgestromin 6mg + Ethinylestradiol 0.6mg Transdermal Patch', 'Contraception & Family Planning', '1 Patch', 'Weekly', 'Apply to clean dry skin', '3 Weeks', 'Contraceptive Patch', 'Apply 1 patch weekly for 3 weeks followed by 1 patch-free week'),
  ('medicine', null, 'Etonogestrel + Ethinylestradiol Vaginal Ring (NuvaRing)', 'Contraception & Family Planning', '1 Ring', 'Continuous 3 Weeks', 'Insert into vagina', '3 Weeks', 'Vaginal Contraceptive Ring', 'Insert for 3 continuous weeks; remove for 1 week for withdrawal bleed'),

  -- ─── 6. Vaginal Health & Infections ───
  ('medicine', null, 'Fluconazole 150mg', 'Vaginal Health & Infections', '150mg', 'Single Dose', 'After Food', '1 Day', 'Vulvovaginal Candidiasis', 'Single oral dose for acute uncomplicated yeast infection'),
  ('medicine', null, 'Fluconazole 150mg (Recurrent Protocol: D1, D4, D7)', 'Vaginal Health & Infections', '150mg', 'Pulse (Day 1, 4, 7)', 'After Food', '7 Days', 'Recurrent Candidiasis', 'Then weekly maintenance 150mg for 6 months if recurrent'),
  ('medicine', null, 'Itraconazole 100mg', 'Vaginal Health & Infections', '100mg', '1-0-1', 'Immediately After Full Meal', '7 Days', 'Refractory Vaginal Mycosis', 'Absorption requires gastric acidity and full meal'),
  ('medicine', null, 'Itraconazole 200mg', 'Vaginal Health & Infections', '200mg', '1-0-1', 'Immediately After Full Meal', '1 Day', 'Single-Day Pulse Antifungal', 'High-dose 1-day pulse therapy'),
  ('medicine', null, 'Clotrimazole 100mg Vaginal Pessary', 'Vaginal Health & Infections', '100mg', '0-0-1 (Vaginal)', 'Bedtime with applicator', '6 Days', 'Vaginal Yeast Infection', 'Insert deeply into vagina at bedtime for 6 consecutive nights'),
  ('medicine', null, 'Clotrimazole 500mg Vaginal Pessary', 'Vaginal Health & Infections', '500mg', 'Single Dose (Vaginal)', 'Bedtime with applicator', '1 Night', '1-Night Yeast Treatment', 'Single-dose high potency vaginal pessary'),
  ('medicine', null, 'Miconazole Nitrate 2% Vaginal Cream', 'Vaginal Health & Infections', '5g/appl', '0-0-1 (Vaginal)', 'Bedtime with applicator', '7 Days', 'Vaginal & Vulval Yeast', 'Apply intravaginally and to external irritated vulva'),
  ('medicine', null, 'Sertaconazole Nitrate 500mg Vaginal Tablet', 'Vaginal Health & Infections', '500mg', 'Single Dose (Vaginal)', 'Bedtime', '1 Night', 'Broad Spectrum Antifungal', 'Broad spectrum fungicidal vaginal ovule'),
  ('medicine', null, 'Metronidazole 400mg', 'Vaginal Health & Infections', '400mg', '1-0-1', 'After Food', '7 Days', 'Bacterial Vaginosis / Trichomoniasis', 'Strictly avoid all alcohol consumption during and for 48h after therapy'),
  ('medicine', null, 'Metronidazole 500mg (TDS Protocol)', 'Vaginal Health & Infections', '500mg', '1-1-1', 'After Meals', '7 Days', 'Pelvic Inflammatory Disease', 'Partner treatment required if Trichomoniasis confirmed'),
  ('medicine', null, 'Tinidazole 500mg', 'Vaginal Health & Infections', '500mg', '1-0-1', 'After Food', '5 Days', 'Trichomoniasis / BV', 'Second-generation 5-nitroimidazole'),
  ('medicine', null, 'Tinidazole 2g Single Dose (4 x 500mg)', 'Vaginal Health & Infections', '2g (4 tabs)', 'Single Dose', 'With Food', '1 Day', '1-Day Trichomoniasis Protocol', 'Take all 4 tablets together with a heavy meal'),
  ('medicine', null, 'Secnidazole 2g Sachet/Tablets', 'Vaginal Health & Infections', '2g', 'Single Dose', 'With main meal', '1 Day', 'Single Dose BV/Trich', 'Long half-life nitroimidazole for single-dose cure'),
  ('medicine', null, 'Clindamycin 300mg', 'Vaginal Health & Infections', '300mg', '1-0-1', 'After Food with full glass water', '7 Days', 'Bacterial Vaginosis (Oral)', 'Alternative for metronidazole-intolerant patients'),
  ('medicine', null, 'Clindamycin 2% Vaginal Cream', 'Vaginal Health & Infections', '5g/appl', '0-0-1 (Vaginal)', 'Bedtime with applicator', '7 Days', 'Topical BV Therapy', 'May weaken latex condoms; use non-latex barrier'),
  ('medicine', null, 'Dequalinium Chloride 10mg Vaginal Tablet (Fluomizin)', 'Vaginal Health & Infections', '10mg', '0-0-1 (Vaginal)', 'Bedtime', '6 Days', 'Mixed Vaginal Infections / BV', 'Broad spectrum antiseptic without disrupting normal lactobacilli'),
  ('medicine', null, 'Oral Vaginal Probiotics (L. rhamnosus GR-1 & L. reuteri RC-14)', 'Vaginal Health & Infections', '1 Cap', '1-0-0', 'Morning with water', '30 Days', 'Vaginal Flora Restoration', 'Restores healthy acidic vaginal microbiome and prevents BV/yeast relapse'),
  ('medicine', null, 'Lactic Acid & Tea Tree Vaginal Gel', 'Vaginal Health & Infections', '1 Appl', '0-0-1 (Vaginal)', 'Bedtime', '7 Days', 'pH Balancer', 'Restores natural acidic vaginal pH (3.8-4.5)'),

  -- ─── 7. UTI & Bladder Care ───
  ('medicine', null, 'Nitrofurantoin 100mg Sustained Release (Macrobid)', 'UTI & Bladder Care', '100mg', '1-0-1', 'With Food or Milk', '5 Days', 'Acute Uncomplicated UTI', 'First-line urinary antiseptic; take with food to improve absorption'),
  ('medicine', null, 'Nitrofurantoin 50mg (Prophylaxis)', 'UTI & Bladder Care', '50mg', '0-0-1', 'Bedtime after emptying bladder', '30 Days', 'Recurrent UTI Prophylaxis', 'Long-term post-coital or nightly suppression'),
  ('medicine', null, 'Fosfomycin Trometamol 3g Sachet (Monurol)', 'UTI & Bladder Care', '3g', 'Single Dose', 'Empty bladder at bedtime with 100ml water', '1 Day', '1-Dose Acute Cystitis', 'Dissolve in cold water on empty stomach 2 hours after dinner'),
  ('medicine', null, 'Cefixime 200mg', 'UTI & Bladder Care', '200mg', '1-0-1', 'After Food', '5 Days', 'Urinary / Respiratory Infection', 'Third-generation oral cephalosporin'),
  ('medicine', null, 'Cefixime 400mg', 'UTI & Bladder Care', '400mg', '1-0-0', 'After Food', '5 Days', 'Complicated UTI', 'Once-daily cephalosporin regimen'),
  ('medicine', null, 'Ciprofloxacin 500mg', 'UTI & Bladder Care', '500mg', '1-0-1', '2h after food', '5 Days', 'Complicated UTI / PID', 'Drink plenty of fluids; avoid antacids/dairy within 2 hours'),
  ('medicine', null, 'Ofloxacin 200mg + Ornidazole 500mg', 'UTI & Bladder Care', '1 Tab', '1-0-1', 'After Meals', '5 Days', 'Pelvic & UTI Mixed Infection', 'Dual coverage for aerobic gram-negative and anaerobes'),
  ('medicine', null, 'Doxycycline 100mg', 'UTI & Bladder Care', '100mg', '1-0-1', 'With large glass of water sitting upright', '14 Days', 'Pelvic Inflammatory Disease / Chlamydia', 'Do not lie down for 30 minutes after taking to prevent esophagitis'),
  ('medicine', null, 'Azithromycin 1g Single Dose (2 x 500mg)', 'UTI & Bladder Care', '1g (2 tabs)', 'Single Dose', '1h before or 2h after food', '1 Day', 'Chlamydia STI Protocol', 'Single-dose cure for uncomplicated genital chlamydia; treat partner'),
  ('medicine', null, 'Cranberry Extract + D-Mannose + Potassium Citrate Sachet', 'UTI & Bladder Care', '1 Sachet', '1-0-1', 'Dissolved in full glass of water', '15 Days', 'UTI Cleanser / Anti-Adhesion', 'Prevents E. coli adhesion to uroepithelial receptors'),
  ('medicine', null, 'Disodium Hydrogen Citrate Syrup', 'UTI & Bladder Care', '15ml', '1-1-1', 'Diluted in a glass of water', '5 Days', 'Urinary Burning Sensation', 'Relieves dysuria by raising urinary pH'),
  ('medicine', null, 'Flavoxate HCl 200mg', 'UTI & Bladder Care', '200mg', '1-1-1', 'After Food', '5 Days', 'Bladder Spasms / Dysuria', 'Urological antispasmodic for bladder neck irritation'),

  -- ─── 8. Thyroid, Endocrine & Bone Health ───
  ('medicine', null, 'Levothyroxine Sodium 12.5mcg', 'Thyroid, Endocrine & Bone Health', '12.5mcg', '1-0-0', 'Strictly Empty Stomach Morning', '90 Days', 'Subclinical Hypothyroidism', 'Take with plain water 45-60 mins before tea/coffee/breakfast'),
  ('medicine', null, 'Levothyroxine Sodium 25mcg', 'Thyroid, Endocrine & Bone Health', '25mcg', '1-0-0', 'Strictly Empty Stomach Morning', '90 Days', 'Hypothyroidism Start Dose', 'Do not take with iron or calcium supplements (keep 4h gap)'),
  ('medicine', null, 'Levothyroxine Sodium 50mcg', 'Thyroid, Endocrine & Bone Health', '50mcg', '1-0-0', 'Strictly Empty Stomach Morning', '90 Days', 'Target TSH 1.0-2.5 in Pregnancy', 'Re-check serum TSH in 6 weeks for dose adjustment'),
  ('medicine', null, 'Levothyroxine Sodium 75mcg', 'Thyroid, Endocrine & Bone Health', '75mcg', '1-0-0', 'Strictly Empty Stomach Morning', '90 Days', 'Hypothyroidism Maintenance', 'Consistent morning timing is mandatory'),
  ('medicine', null, 'Levothyroxine Sodium 88mcg', 'Thyroid, Endocrine & Bone Health', '88mcg', '1-0-0', 'Strictly Empty Stomach Morning', '90 Days', 'Fine-Tuning Thyroid Dose', 'Take with plain water only'),
  ('medicine', null, 'Levothyroxine Sodium 100mcg', 'Thyroid, Endocrine & Bone Health', '100mcg', '1-0-0', 'Strictly Empty Stomach Morning', '90 Days', 'Full Replacement Dose', 'Maintain 4-hour separation from calcium/iron/antacids'),
  ('medicine', null, 'Levothyroxine Sodium 112mcg', 'Thyroid, Endocrine & Bone Health', '112mcg', '1-0-0', 'Strictly Empty Stomach Morning', '90 Days', 'Thyroid Replacement', 'For postoperative or post-ablation hypothyroidism'),
  ('medicine', null, 'Levothyroxine Sodium 125mcg', 'Thyroid, Endocrine & Bone Health', '125mcg', '1-0-0', 'Strictly Empty Stomach Morning', '90 Days', 'High-Dose Thyroid Hormone', 'Check ECG and free hormones regularly in elderly patients'),
  ('medicine', null, 'Levothyroxine Sodium 150mcg', 'Thyroid, Endocrine & Bone Health', '150mcg', '1-0-0', 'Strictly Empty Stomach Morning', '90 Days', 'TSH Suppression Therapy', 'Used in post-thyroid carcinoma or severe hypothyroidism'),
  ('medicine', null, 'Carbimazole 5mg', 'Thyroid, Endocrine & Bone Health', '5mg', '1-0-1', 'After Food', '60 Days', 'Hyperthyroidism', 'Monitor WBC count for fever/sore throat (agranulocytosis risk)'),
  ('medicine', null, 'Carbimazole 10mg', 'Thyroid, Endocrine & Bone Health', '10mg', '1-0-1', 'After Food', '60 Days', 'Thyrotoxicosis', 'Antithyroid agent'),
  ('medicine', null, 'Propylthiouracil (PTU) 50mg', 'Thyroid, Endocrine & Bone Health', '50mg', '1-1-1', 'After Food', '60 Days', 'Hyperthyroidism (1st Trimester)', 'Preferred antithyroid drug in first trimester of pregnancy'),
  ('medicine', null, 'Vitamin D3 (Cholecalciferol) 60,000 IU Capsule', 'Thyroid, Endocrine & Bone Health', '60,000 IU', 'Once Weekly', 'With fatty meal or warm milk', '8 Weeks', 'Vitamin D Deficiency', 'Fat-soluble vitamin; best absorbed with milk or dietary fat'),
  ('medicine', null, 'Vitamin D3 (Cholecalciferol) 60,000 IU Oral Solution / Shots', 'Thyroid, Endocrine & Bone Health', '60k IU/5ml', 'Once Weekly', 'With milk after meal', '8 Weeks', 'Liquid Vitamin D Shot', 'Pre-measured 5ml sugar-free liquid shot'),
  ('medicine', null, 'Vitamin D3 2,000 IU Daily Maintenance', 'Thyroid, Endocrine & Bone Health', '2,000 IU', '1-0-0', 'After Breakfast', '90 Days', 'Daily Maintenance D3', 'For long-term maintenance after deficiency correction'),
  ('medicine', null, 'Calcium Citrate Malate 1200mg + Calcitriol + Zinc + Magnesium', 'Thyroid, Endocrine & Bone Health', '1 Tab', '0-0-1', 'After Dinner', '60 Days', 'Bone & Mineral Density', 'Better absorption and lower kidney stone risk than calcium carbonate'),
  ('medicine', null, 'Elemental Calcium 500mg + Vitamin D3 250 IU (Shelcal)', 'Thyroid, Endocrine & Bone Health', '1 Tab', '1-0-0', 'After Lunch', '60 Days', 'Standard Calcium Supplement', 'Do not take at same time as iron or thyroid tablets'),
  ('medicine', null, 'Alendronate Sodium 70mg (Weekly)', 'Thyroid, Endocrine & Bone Health', '70mg', 'Once Weekly', 'First thing morning with full glass plain water', '12 Weeks', 'Postmenopausal Osteoporosis', 'Must sit or stand upright for 30 minutes; do not eat for 30 mins'),
  ('medicine', null, 'Ibandronic Acid 150mg (Monthly)', 'Thyroid, Endocrine & Bone Health', '150mg', 'Once Monthly', 'Morning empty stomach with plain water', '6 Months', 'Monthly Bisphosphonate', 'Take same calendar day each month; stay upright for 60 minutes'),
  ('medicine', null, 'Zoledronic Acid 5mg IV Infusion', 'Thyroid, Endocrine & Bone Health', '5mg', 'Once Yearly (IV)', 'Slow IV over 20 mins with adequate hydration', '1 Year', 'Annual Osteoporosis Infusion', 'Ensure normal serum calcium and creatinine before infusion'),
  ('medicine', null, 'Denosumab 60mg SubQ (Prolia)', 'Thyroid, Endocrine & Bone Health', '60mg', 'Every 6 Months (SC)', 'Upper Arm / Thigh / Abdomen', '6 Months', 'RANKL Inhibitor', 'Administer every 6 months; ensure adequate calcium and D3 co-therapy'),
  ('medicine', null, 'Teriparatide 20mcg/day SubQ (Forteo)', 'Thyroid, Endocrine & Bone Health', '20mcg', 'Once Daily (SC)', 'Thigh / Lower Abdominal wall', '1 Year', 'Anabolic Bone Builder', 'For severe osteoporosis with prior vertebral fractures'),

  -- ─── 9. Prenatal & Antenatal Care ───
  ('medicine', null, 'Folic Acid 5mg', 'Prenatal & Antenatal Care', '5mg', '1-0-0', 'After Breakfast', '90 Days', 'Pre-Conception & 1st Trimester', 'Essential for preventing neural tube defects (NTDs)'),
  ('medicine', null, 'L-Methylfolate 1mg + Methylcobalamin 1500mcg + Pyridoxal-5-Phosphate', 'Prenatal & Antenatal Care', '1 Tab', '1-0-0', 'After Breakfast', '90 Days', 'Active Bio-Folate (MTHFR Safe)', 'Directly bioavailable folate for MTHFR gene variants'),
  ('medicine', null, 'Ferrous Ascorbate 100mg + Folic Acid 1.5mg + Zinc', 'Prenatal & Antenatal Care', '1 Tab', '0-0-1', '2h after dinner or at bedtime', '90 Days', 'Pregnancy Anemia / Iron Def.', 'Do not take with milk/tea; orange juice enhances absorption'),
  ('medicine', null, 'Liposomal Iron 30mg + Vitamin C (Gentle Iron)', 'Prenatal & Antenatal Care', '1 Cap', '1-0-0', 'Anytime with or without food', '60 Days', 'Non-Constipating Iron', 'Liposomal encapsulation prevents GI upset and constipation'),
  ('medicine', null, 'Sodium Feredetate (Iron Sodium EDTA) 33mg/5ml Syrup', 'Prenatal & Antenatal Care', '10ml', '1-0-1', 'After Meals', '60 Days', 'Liquid Iron Supplement', 'High bioavailability with low teeth staining'),
  ('medicine', null, 'Ferric Carboxymaltose 500mg IV Infusion', 'Prenatal & Antenatal Care', '500mg', 'Single IV Drip', 'Diluted in 100ml 0.9% NaCl over 15 mins', '1 Day', 'Severe Gestational Anemia', 'For rapid iron repletion when oral iron fails or Hb < 8.0 g/dL'),
  ('medicine', null, 'DHA 200mg (Vegetarian / Algal Omega-3)', 'Prenatal & Antenatal Care', '200mg', '1-0-0', 'After Lunch', '90 Days', 'Fetal Neurodevelopment', 'Promotes fetal brain, retinal, and neural development'),
  ('medicine', null, 'Doxylamine Succinate 10mg + Pyridoxine (Vit B6) 10mg (Doxinate)', 'Prenatal & Antenatal Care', '1 Tab', '0-0-2 (Night)', 'Bedtime with water', '30 Days', 'Hyperemesis Gravidarum / Morning Sickness', 'First-line FDA approved combination for pregnancy nausea and vomiting'),
  ('medicine', null, 'Doxylamine 20mg + Pyridoxine 20mg + Folic Acid 5mg (Doxinate Plus)', 'Prenatal & Antenatal Care', '1 Tab', '0-0-1', 'Bedtime', '30 Days', 'Morning Sickness Plus Folate', 'Take 1 tablet at night; add 1 tablet morning if daytime nausea occurs'),
  ('medicine', null, 'Ondansetron 4mg (Mouth Dissolving)', 'Prenatal & Antenatal Care', '4mg', '1-0-1', 'Place on tongue 30 mins before food', '5 Days', 'Severe Refractory Vomiting', 'Quick dissolve formulation for acute pregnancy nausea'),
  ('medicine', null, 'Metoclopramide 10mg', 'Prenatal & Antenatal Care', '10mg', '1-0-1', '15 mins Before Meals', '5 Days', 'Gastric Motility & Nausea', 'Prokinetic antiemetic'),
  ('medicine', null, 'Labetalol 100mg', 'Prenatal & Antenatal Care', '100mg', '1-0-1', 'With Meals', '30 Days', 'Gestational Hypertension / Preeclampsia', 'First-line oral antihypertensive in pregnancy; monitor maternal BP'),
  ('medicine', null, 'Methyldopa 250mg', 'Prenatal & Antenatal Care', '250mg', '1-1-1', 'After Food', '30 Days', 'Chronic Hypertension in Pregnancy', 'Centrally acting alpha-2 agonist with extensive pregnancy safety record'),
  ('medicine', null, 'Nifedipine 20mg Retard / SR', 'Prenatal & Antenatal Care', '20mg', '1-0-1', 'After Food', '30 Days', 'Preeclampsia / Tocolysis', 'Calcium channel blocker for blood pressure and preterm labor tocolysis'),
  ('medicine', null, 'Aspirin 75mg (Low Dose / Ecosprin 75)', 'Prenatal & Antenatal Care', '75mg', '0-0-1', 'After Dinner', '150 Days', 'Preeclampsia Prophylaxis', 'Initiate between 12-16 weeks for high risk preeclampsia or APS history'),
  ('medicine', null, 'Aspirin 150mg (Low Dose / Ecosprin 150)', 'Prenatal & Antenatal Care', '150mg', '0-0-1', 'After Dinner', '150 Days', 'High-Risk Preeclampsia Prevention', 'ACOG/NICE recommended dose for high preeclampsia uterine Doppler notches'),
  ('medicine', null, 'Enoxaparin Sodium 40mg (0.4ml) SubQ (LMWH)', 'Prenatal & Antenatal Care', '40mg (0.4ml)', 'Once Daily (SC)', 'Subcutaneous in anterolateral abdomen', '30 Days', 'Thrombophilia / APS in Pregnancy', 'Rotate injection sites around umbilical region; do not rub site'),
  ('medicine', null, 'Enoxaparin Sodium 60mg (0.6ml) SubQ (LMWH)', 'Prenatal & Antenatal Care', '60mg (0.6ml)', 'Once Daily (SC)', 'Subcutaneous', '30 Days', 'Therapeutic Anticoagulation', 'For acute DVT or mechanical valve in pregnancy'),

  -- ─── 10. Menopause, HRT & Atrophy ───
  ('medicine', null, '17-Beta Estradiol 1mg (Oral)', 'Menopause, HRT & Atrophy', '1mg', '1-0-0', 'Morning with food', '30 Days', 'Menopausal Vasomotor Symptoms', 'For hot flashes and night sweats; combine with progestin if uterus intact'),
  ('medicine', null, '17-Beta Estradiol 2mg (Oral)', 'Menopause, HRT & Atrophy', '2mg', '1-0-0', 'Morning with food', '30 Days', 'Moderate-Severe Hot Flashes', 'Titrate to lowest effective dose'),
  ('medicine', null, 'Estradiol Transdermal Gel 0.06% (Oestrogel)', 'Menopause, HRT & Atrophy', '1.25g (1 measure)', 'Once Daily', 'Apply to arms/shoulders after morning bath', '30 Days', 'Transdermal Bioidentical Estrogen', 'Avoid breasts and vulval area; lower thromboembolic risk than oral estrogen'),
  ('medicine', null, 'Estradiol Transdermal Patch 50mcg (Estraderm)', 'Menopause, HRT & Atrophy', '50mcg/day', 'Twice Weekly Patch', 'Apply to lower abdomen/buttocks', '4 Weeks', 'Constant-Rate Estrogen Patch', 'Change patch every 3-4 days; rotate application sites'),
  ('medicine', null, 'Estriol 0.1% Vaginal Cream (Ovestin)', 'Menopause, HRT & Atrophy', '1 Appl', '0-0-1 (Vaginal)', 'Bedtime with applicator', '14 Days', 'Genitourinary Syndrome of Menopause', 'Use daily for 2 weeks, then reduce to twice weekly maintenance'),
  ('medicine', null, 'Conjugated Estrogens 0.625mg + MPA 2.5mg (Prempro)', 'Menopause, HRT & Atrophy', '1 Tab', '1-0-0', 'Fixed time morning', '28 Days', 'Continuous Combined HRT', 'For postmenopausal women with intact uterus to prevent hyperplasia'),
  ('medicine', null, 'Tibolone 2.5mg (Livial)', 'Menopause, HRT & Atrophy', '2.5mg', '1-0-0', 'Fixed time morning', '30 Days', 'STEAR / Menopausal Health', 'Triple estrogenic, progestogenic, and androgenic action; improves libido'),
  ('medicine', null, 'Isoflavones (Soy & Red Clover 40mg) + Cohosh', 'Menopause, HRT & Atrophy', '1 Tab', '1-0-1', 'After Meals', '60 Days', 'Phytoestrogen Menopause Support', 'Natural non-hormonal management for mild climacteric symptoms'),
  ('medicine', null, 'Paroxetine 7.5mg (Brisdelle)', 'Menopause, HRT & Atrophy', '7.5mg', '0-0-1', 'Bedtime', '60 Days', 'Non-Hormonal Hot Flash Relief', 'Only FDA approved non-hormonal SSRI for vasomotor hot flashes'),
  ('medicine', null, 'Gabapentin 300mg', 'Menopause, HRT & Atrophy', '300mg', '0-0-1', 'Bedtime', '30 Days', 'Nocturnal Hot Flashes & Insomnia', 'Helps nighttime awakenings and severe sweating'),

  -- ─── 11. Dermatology & PCOS Aesthetics ───
  ('medicine', null, 'Eflornithine 13.9% Topical Cream (Vaniqa)', 'Dermatology & PCOS Aesthetics', 'Thin Film', 'Twice Daily', 'Rub thoroughly into facial hirsutism areas', '60 Days', 'Facial Hirsutism / Facial Hair', 'Slows hair growth; visible results in 6-8 weeks; do not wash face for 4h'),
  ('medicine', null, 'Azelaic Acid 15% Gel (Finacea)', 'Dermatology & PCOS Aesthetics', 'Thin Film', '1-0-1', 'Clean dry facial skin', '60 Days', 'PCOS Hormonal Acne / Rosacea', 'Anti-inflammatory, anti-androgenic and pregnancy-safe acne treatment'),
  ('medicine', null, 'Azelaic Acid 20% Cream', 'Dermatology & PCOS Aesthetics', 'Thin Film', '0-0-1', 'Bedtime on affected areas', '60 Days', 'Acne & Post-Inflammatory Hyperpigmentation', 'Reduces melanin production and clears blemishes'),
  ('medicine', null, 'Clindamycin 1% + Nicotinamide 4% Gel', 'Dermatology & PCOS Aesthetics', 'Thin Film', '1-0-1', 'Topical application to acne lesions', '30 Days', 'Inflammatory Acne Vulgaris', 'Non-drying antibiotic and anti-inflammatory gel'),
  ('medicine', null, 'Tretinoin 0.025% Cream', 'Dermatology & PCOS Aesthetics', 'Pea Sized', '0-0-1', 'Bedtime on dry face', '60 Days', 'Comedonal Acne', 'Strictly contraindicated in pregnancy; use sunscreen in daytime'),
  ('medicine', null, 'Minoxidil 2% Topical Solution (Women)', 'Dermatology & PCOS Aesthetics', '1ml', '1-0-1', 'Apply to dry scalp with dropper', '90 Days', 'Female Pattern Hair Loss (FPHL)', 'Apply directly to vertex thinning; massage gently; wash hands'),
  ('medicine', null, 'Minoxidil 5% Topical Foam (Once Daily for Women)', 'Dermatology & PCOS Aesthetics', 'Half Capful', '0-0-1', 'Night on dry scalp', '90 Days', 'Androgenetic Alopecia in Women', 'Once-daily convenient foam formulation with low scalp irritation'),
  ('medicine', null, 'Biotin 10mg + Amino Acids + Zinc + Silica (Follicle Nourish)', 'Dermatology & PCOS Aesthetics', '1 Tab', '1-0-0', 'After Breakfast', '90 Days', 'Hair & Nail Fortifier', 'Supports keratin synthesis for telogen effluvium and thinning hair')
on conflict do nothing;

-- ==============================================================================
-- 🧪 2. GLOBAL LAB & DIAGNOSTIC TEST CATALOG (ORGANIZED BY CLINICAL CATEGORY)
-- ==============================================================================

insert into public.clinical_catalog (type, doctor_id, name, category, badge, instructions)
values
  -- ─── 1. Hormonal & Ovarian Reserve ───
  ('lab_test', null, 'LH (Luteinizing Hormone)', 'Hormonal & Ovarian Reserve', '🌸 Hormones', 'Recommended Day 2 to Day 4 of menstrual cycle (Fasting)'),
  ('lab_test', null, 'FSH (Follicle Stimulating Hormone)', 'Hormonal & Ovarian Reserve', '🌸 Hormones', 'Recommended Day 2 to Day 4 of cycle for baseline ovarian assessment'),
  ('lab_test', null, 'LH & FSH Ratio (PCOS Marker)', 'Hormonal & Ovarian Reserve', '🌸 PCOS/Cycle', 'LH:FSH ratio > 2:1 on Day 2/3 strongly indicates PCOS pattern'),
  ('lab_test', null, 'Serum AMH (Anti-Müllerian Hormone / Ovarian Reserve)', 'Hormonal & Ovarian Reserve', '🌸 Fertility', 'Can be tested on any day of cycle; unaffected by oral contraceptives'),
  ('lab_test', null, 'Serum Estradiol (E2) - Baseline', 'Hormonal & Ovarian Reserve', '🌸 Hormones', 'Collect Day 2 or 3 of cycle (Baseline follicular level < 50 pg/mL)'),
  ('lab_test', null, 'Serum Estradiol (E2) - Pre-Ovulatory Peak', 'Hormonal & Ovarian Reserve', '🌸 Fertility', 'Collect mid-cycle when lead follicle is 18mm+ (200-300 pg/mL per mature follicle)'),
  ('lab_test', null, 'Serum Progesterone (Day 21 / Mid-Luteal Phase)', 'Hormonal & Ovarian Reserve', '🌸 Ovulation Check', 'Collect 7 days before expected menses (Day 21 in 28-day cycle); > 10 ng/mL confirms ovulation'),
  ('lab_test', null, 'Serum Prolactin (Fasting)', 'Hormonal & Ovarian Reserve', '⚡ Pituitary', 'Collect between 8-10 AM; rest quietly for 20 mins prior; avoid breast stimulation/exercise'),
  ('lab_test', null, 'Macroprolactin Screen (PEG Precipitation)', 'Hormonal & Ovarian Reserve', '⚡ Pituitary', 'Differentiates true hyperprolactinemia from monomeric/macroprolactin complexes'),
  ('lab_test', null, 'Total Serum Testosterone', 'Hormonal & Ovarian Reserve', '🌸 Androgens', 'Early morning sample preferred when androgen levels peak'),
  ('lab_test', null, 'Free & Bioavailable Testosterone', 'Hormonal & Ovarian Reserve', '🌸 Hyperandrogenism', 'Sensitive marker for clinical hyperandrogenism and hirsutism in women'),
  ('lab_test', null, 'Free Androgen Index (FAI = Total T / SHBG x 100)', 'Hormonal & Ovarian Reserve', '🌸 Androgen Excess', 'Key calculated biochemical marker for PCOS phenotype diagnostic criteria'),
  ('lab_test', null, 'Sex Hormone Binding Globulin (SHBG)', 'Hormonal & Ovarian Reserve', '🌸 Proteins', 'Circulating carrier protein; lower levels increase active free androgen fraction'),
  ('lab_test', null, 'DHEA-Sulfate (Dehydroepiandrosterone Sulfate)', 'Hormonal & Ovarian Reserve', '🌸 Adrenal Androgen', 'Evaluates adrenal androgen contribution to virilization/hirsutism'),
  ('lab_test', null, 'Serum Androstenedione', 'Hormonal & Ovarian Reserve', '🌸 Androgens', 'Intermediate androgen produced by both ovaries and adrenal cortex'),
  ('lab_test', null, '17-Hydroxyprogesterone (17-OHP - Fasting Morning)', 'Hormonal & Ovarian Reserve', '🌸 CAH Screening', 'Screening test to rule out Non-Classical Congenital Adrenal Hyperplasia (NCAH)'),
  ('lab_test', null, 'Serum Inhibin B', 'Hormonal & Ovarian Reserve', '🌸 Ovarian Reserve', 'Day 3 marker of granulosa cell activity and functional ovarian pool'),
  ('lab_test', null, 'Beta hCG (Quantitative Pregnancy / Tumour Marker)', 'Hormonal & Ovarian Reserve', '🤰 Pregnancy / hCG', 'Serial doubling time evaluated every 48 hours in early pregnancy assessment'),

  -- ─── 2. Thyroid, Endocrine & Autoimmune ───
  ('lab_test', null, 'Thyroid Profile (Total T3, Total T4, Ultrasensitive TSH)', 'Thyroid, Endocrine & Autoimmune', '🦋 Thyroid Standard', 'Overnight fasting; take morning levothyroxine tablet AFTER blood draw'),
  ('lab_test', null, 'Free Thyroid Panel (FT3, FT4, TSH Ultrasensitive 4th Gen)', 'Thyroid, Endocrine & Autoimmune', '🦋 Free Hormones', 'Unbound active thyroid hormones; essential during pregnancy & OCP use'),
  ('lab_test', null, 'Anti-TPO Antibodies (Thyroid Peroxidase / Hashimoto''s)', 'Thyroid, Endocrine & Autoimmune', '🦋 Autoimmune Thyroid', 'Identifies autoimmune thyroiditis and risk of miscarriage/hypothyroidism'),
  ('lab_test', null, 'Anti-Thyroglobulin (Anti-Tg) Antibodies', 'Thyroid, Endocrine & Autoimmune', '🦋 Autoimmune Thyroid', 'Complementary marker for autoimmune thyroid destruction'),
  ('lab_test', null, 'TSH Receptor Antibodies (TRAb / TSI - Graves'' Disease)', 'Thyroid, Endocrine & Autoimmune', '🦋 Hyperthyroid Autoimmune', 'Confirms Graves'' thyrotoxicosis and transplacental transfer risk'),
  ('lab_test', null, 'Antinuclear Antibodies (ANA by Indirect Immunofluorescence - IFA)', 'Thyroid, Endocrine & Autoimmune', '🛡️ Connective Tissue', 'Screens for systemic autoimmune and connective tissue disorders (SLE, Sjogren)'),
  ('lab_test', null, 'Anti-dsDNA Antibodies (Quantitative)', 'Thyroid, Endocrine & Autoimmune', '🛡️ Lupus / SLE', 'Specific marker for Systemic Lupus Erythematosus flare and nephritis'),
  ('lab_test', null, 'Anti-Phospholipid Antibodies Panel (aPL Complete)', 'Thyroid, Endocrine & Autoimmune', '🛡️ Recurrent Loss / APS', 'Includes Lupus Anticoagulant, aCL, and Anti-Beta2 Glycoprotein I for recurrent pregnancy loss'),
  ('lab_test', null, 'Lupus Anticoagulant Screen (dRVVT Screen & Confirm)', 'Thyroid, Endocrine & Autoimmune', '🛡️ Thrombophilia', 'Evaluates prolonged phospholipid-dependent clotting for APS diagnosis'),
  ('lab_test', null, 'Anti-Cardiolipin Antibodies (IgG & IgM)', 'Thyroid, Endocrine & Autoimmune', '🛡️ APS Panel', 'Enzyme immunoassay for antiphospholipid syndrome evaluation'),
  ('lab_test', null, 'Anti-Beta-2 Glycoprotein I Antibodies (IgG & IgM)', 'Thyroid, Endocrine & Autoimmune', '🛡️ APS Specific', 'Highly specific antibody for vascular thrombosis and obstetric complications'),

  -- ─── 3. Metabolic & Cardiovascular ───
  ('lab_test', null, 'Fasting Blood Glucose (FBG)', 'Metabolic & Cardiovascular', '🍬 Glucose', '10-12 hours overnight fasting mandatory'),
  ('lab_test', null, 'Postprandial Blood Glucose (2-Hour PPBG)', 'Metabolic & Cardiovascular', '🍬 Glucose', 'Exactly 2 hours from the start of a standard meal'),
  ('lab_test', null, 'Oral Glucose Tolerance Test (OGTT - 75g 3-Point: 0, 1h, 2h)', 'Metabolic & Cardiovascular', '🍬 GDM & PCOS Screen', 'Gold standard for Gestational Diabetes Mellitus and occult impaired glucose tolerance'),
  ('lab_test', null, 'HbA1c (Glycated Hemoglobin - HPLC Certified)', 'Metabolic & Cardiovascular', '🍬 3-Month Sugar', 'Evaluates mean glycemic control over preceding 90-120 days; no fasting required'),
  ('lab_test', null, 'Fasting Serum Insulin', 'Metabolic & Cardiovascular', '🍬 Insulin', 'Overnight 10h fast; assess hyperinsulinemia and metabolic syndrome'),
  ('lab_test', null, 'Postprandial Serum Insulin (2-Hour)', 'Metabolic & Cardiovascular', '🍬 Insulin Peak', 'Evaluates delayed compensatory hyperinsulinemic surge in PCOS'),
  ('lab_test', null, 'HOMA-IR (Homeostatic Model Assessment of Insulin Resistance)', 'Metabolic & Cardiovascular', '🩸 Insulin Resistance', 'Calculated from fasting glucose and fasting insulin; values > 2.0 indicate IR'),
  ('lab_test', null, 'Complete Lipid Profile (TC, HDL, LDL, VLDL, TG, Non-HDL)', 'Metabolic & Cardiovascular', '🫀 Cardio Screen', '12-hour strict fasting; assesses dyslipidemia in PCOS and metabolic syndrome'),
  ('lab_test', null, 'High-Sensitivity C-Reactive Protein (hs-CRP)', 'Metabolic & Cardiovascular', '🫀 Inflammation', 'Cardiovascular risk and systemic low-grade chronic inflammation marker in PCOS'),
  ('lab_test', null, 'Liver Function Test (LFT - Bilirubin, SGOT, SGPT, ALP, Protein, Albumin)', 'Metabolic & Cardiovascular', '🫁 Hepatic Screen', 'Baseline check prior to starting statins, OCPs, or hormonal agents'),
  ('lab_test', null, 'Kidney Function Test (KFT / RFT - Urea, BUN, Creatinine, eGFR, Uric Acid)', 'Metabolic & Cardiovascular', '🩺 Renal Screen', 'Assesses renal function, hydration, and uric acid status in preeclampsia & PCOS'),
  ('lab_test', null, 'Serum Electrolytes (Sodium, Potassium, Chloride, Bicarbonate)', 'Metabolic & Cardiovascular', '⚡ Electrolytes', 'Required when initiating spironolactone, drospirenone, or in hyperemesis'),

  -- ─── 4. Hematology, Anemia & Micronutrients ───
  ('lab_test', null, 'Complete Blood Count (CBC) with Automated Differential & ESR', 'Hematology, Anemia & Micronutrients', '🩸 Hematology', 'Evaluates anemia, infection, platelet count, and systemic inflammatory activity'),
  ('lab_test', null, 'Peripheral Blood Smear Examination (PBS)', 'Hematology, Anemia & Micronutrients', '🩸 Morphology', 'Pathologist review of red cell indices (microcytic, macrocytic, dimorphic)'),
  ('lab_test', null, 'Serum Ferritin (Iron Storage Protein)', 'Hematology, Anemia & Micronutrients', '🩸 Iron Stores', 'Most sensitive test for latent and absolute iron deficiency anemia'),
  ('lab_test', null, 'Total Iron Binding Capacity (TIBC) & Transferrin Saturation (%)', 'Hematology, Anemia & Micronutrients', '🩸 Iron Kinetics', 'Full iron kinetics profile with serum iron and transferrin saturation index'),
  ('lab_test', null, '25-Hydroxy Vitamin D3 (Total 25-OH D2 + D3)', 'Hematology, Anemia & Micronutrients', '☀️ Bone & Ovary', 'Optimal level: 30-100 ng/mL; vital for fertility, PCOS, and bone mineralization'),
  ('lab_test', null, 'Serum Vitamin B12 (Cyanocobalamin)', 'Hematology, Anemia & Micronutrients', '⚡ Neurological & Cell', 'Monitor regularly in patients on long-term Metformin therapy'),
  ('lab_test', null, 'Serum Folate & RBC Folate', 'Hematology, Anemia & Micronutrients', '⚡ RBC Folate', 'Evaluates tissue folate sufficiency prior to conception'),
  ('lab_test', null, 'Serum Calcium & Ionic Calcium', 'Hematology, Anemia & Micronutrients', '🦴 Calcium', 'Evaluates bone metabolism, hypocalcemia, and preeclampsia risk factors'),
  ('lab_test', null, 'Serum Magnesium', 'Hematology, Anemia & Micronutrients', '⚡ Micronutrients', 'Important cofactor for insulin sensitivity and prevention of neuromuscular spasms'),
  ('lab_test', null, 'Serum Zinc', 'Hematology, Anemia & Micronutrients', '⚡ Trace Elements', 'Essential for oocyte development, immune function, and epidermal healing'),

  -- ─── 5. Infections & STI Screening ───
  ('lab_test', null, 'High Vaginal Swab (HVS) Gram Stain & Wet Mount', 'Infections & STI Screening', '🛡️ Vaginal Wet Mount', 'Detects bacterial vaginosis (clue cells, Nugent score), trichomonas, and candida'),
  ('lab_test', null, 'Vaginal Swab Aerobic Culture & Antibiotic Sensitivity (Automated)', 'Infections & STI Screening', '🛡️ Microbiology', 'Identifies pathogenic bacteria (Group B Strep, Enterococcus, E. coli) with MIC sensitivity'),
  ('lab_test', null, 'Candida Species Identification & Antifungal Sensitivity', 'Infections & STI Screening', '🛡️ Mycology', 'Differentiates C. albicans from resistant non-albicans species (C. glabrata, C. krusei)'),
  ('lab_test', null, 'Urine Routine & Microscopic Examination', 'Infections & STI Screening', '🛡️ Urinalysis', 'Clean catch midstream morning urine sample; checks pus cells, RBCs, protein, nitrites'),
  ('lab_test', null, 'Urine Culture & Automated Antibiotic Sensitivity (MIC)', 'Infections & STI Screening', '🛡️ Urine Culture', 'Clean catch midstream; colony count > 10^5 CFU/mL indicates significant bacteriuria'),
  ('lab_test', null, 'Chlamydia trachomatis & Neisseria gonorrhoeae DNA PCR', 'Infections & STI Screening', '🛡️ STI Nucleic Acid', 'High-sensitivity multiplex NAAT from cervical swab or first-catch urine'),
  ('lab_test', null, 'Trichomonas vaginalis & Mycoplasma genitalium DNA PCR', 'Infections & STI Screening', '🛡️ STI NAAT Screen', 'Molecular test for atypical cause of non-responsive vaginitis/cervicitis'),
  ('lab_test', null, 'Syphilis Antibody Screen (VDRL / RPR & Treponema TPHA Confirm)', 'Infections & STI Screening', '🛡️ Serology', 'Mandatory antenatal and pre-conceptional screening'),
  ('lab_test', null, 'HIV 1 & 2 4th Gen Duo (p24 Antigen + Antibodies Combo)', 'Infections & STI Screening', '🛡️ Viral Serology', 'Early detection with p24 antigen reduction in diagnostic window period'),
  ('lab_test', null, 'Hepatitis B Surface Antigen (HBsAg - Quantitative/Qualitative)', 'Infections & STI Screening', '🛡️ Viral Hepatitis', 'Mandatory antenatal screen to prevent vertical perinatal transmission'),
  ('lab_test', null, 'Anti-HCV (Hepatitis C Virus Total Antibody)', 'Infections & STI Screening', '🛡️ Hepatitis C', 'Screens for chronic hepatitis C infection'),
  ('lab_test', null, 'Herpes Simplex Virus (HSV 1 & 2) IgG & IgM Serology', 'Infections & STI Screening', '🛡️ Herpes Screen', 'Distinguishes primary acute genital herpes infection from past exposure'),

  -- ─── 6. Cervical Screening & Cytology ───
  ('lab_test', null, 'Liquid-Based Cytology (LBC / ThinPrep Pap Smear)', 'Cervical Screening & Cytology', '🔬 Cervical Cytology', 'Superior specimen preservation and filtration over conventional Pap smear'),
  ('lab_test', null, 'High-Risk HPV DNA PCR with Genotyping (HPV 16, 18 & 12 Others)', 'Cervical Screening & Cytology', '🔬 HR-HPV Screen', 'Gold-standard primary cervical screening for high oncogenic risk HPV strains'),
  ('lab_test', null, 'Cervical Co-Testing (LBC Pap Smear + High-Risk HPV DNA PCR)', 'Cervical Screening & Cytology', '🔬 Dual Co-Testing', 'Highest negative predictive value for cervical intraepithelial neoplasia (CIN)'),
  ('lab_test', null, 'Colposcopy Directed Cervical Punch Biopsy & Histopathology', 'Cervical Screening & Cytology', '🔬 Tissue Biopsy', 'Histopathological grading of CIN 1, CIN 2, CIN 3 / Carcinoma in situ'),
  ('lab_test', null, 'Endometrial Biopsy (Pipelle / Histopathology)', 'Cervical Screening & Cytology', '🔬 Endometrial Tissue', 'Evaluates abnormal uterine bleeding (AUB), hyperplasia, or endometrial malignancy'),

  -- ─── 7. Antenatal & Genetic Diagnostics ───
  ('lab_test', null, 'First Trimester Dual Marker Screen (Free Beta hCG + PAPP-A + NT Scan)', 'Antenatal & Genetic Diagnostics', '🤰 Aneuploidy Screen', 'Performed between 11w0d and 13w6d for Down Syndrome (Trisomy 21, 18, 13) risk calculation'),
  ('lab_test', null, 'Second Trimester Quadruple Marker Screen (AFP, hCG, uE3, Inhibin A)', 'Antenatal & Genetic Diagnostics', '🤰 Genetic Screen', 'Performed between 15w0d and 20w0d when first trimester screen was missed'),
  ('lab_test', null, 'Non-Invasive Prenatal Testing (NIPT / Cell-Free Fetal DNA Screen)', 'Antenatal & Genetic Diagnostics', '🧬 cfDNA Genomics', 'High accuracy non-invasive maternal blood screen from 10 weeks gestation onward'),
  ('lab_test', null, 'Blood Group (ABO) & Rh Typing + Indirect Coomb''s Test (ICT)', 'Antenatal & Genetic Diagnostics', '🩸 Rh Isoimmunization', 'Identifies Rh-negative status and maternal anti-D antibody sensitization'),
  ('lab_test', null, 'Thalassemia Screening by HPLC (Hb Variant / Hemoglobin Electrophoresis)', 'Antenatal & Genetic Diagnostics', '🩸 Thalassemia Trait', 'Essential pre-marital / pre-conceptional screen for HbA2 levels and beta-thalassemia trait'),
  ('lab_test', null, 'TORCH Profile (IgG & IgM for Toxoplasma, Rubella, CMV, HSV)', 'Antenatal & Genetic Diagnostics', '🤰 TORCH Panel', 'Assesses immune protection and acute maternal congenital infections'),
  ('lab_test', null, 'Rubella Virus IgG Antibodies (Immunity Titre)', 'Antenatal & Genetic Diagnostics', '🤰 Vaccine Immunity', 'Confirms protective immunity (Titre > 10 IU/mL) prior to pregnancy'),
  ('lab_test', null, 'Maternal Serum Alpha-Fetoprotein (MSAFP - Neural Tube Defects)', 'Antenatal & Genetic Diagnostics', '🤰 Spina Bifida Screen', 'Screening between 15-20 weeks for open neural tube defects and abdominal wall defects'),

  -- ─── 8. Ultrasound & Imaging Procedures ───
  ('lab_test', null, 'Pelvic Ultrasound (USG Abdomen & Pelvis - Transabdominal)', 'Ultrasound & Imaging Procedures', '📸 Pelvic USG', 'Requires full bladder; evaluates uterus, fibroids, adenomyosis, ovarian morphology'),
  ('lab_test', null, 'Transvaginal Ultrasound (USG TVS - High Resolution)', 'Ultrasound & Imaging Procedures', '📸 High-Res TVS', 'Empty bladder; gold standard for endometrial stripe thickness, AFC, and subtle ovarian pathology'),
  ('lab_test', null, 'Follicular Monitoring Study (Serial TVS Ovulation Tracking - 4-5 Scans)', 'Ultrasound & Imaging Procedures', '📸 Follicular Study', 'Tracking dominant follicle growth (2mm/day), vascularity, and ovulation collapse'),
  ('lab_test', null, '3D/4D Pelvic Ultrasound (Uterine Cavity & Myometrium)', 'Ultrasound & Imaging Procedures', '📸 3D Uterine Cavity', 'Differentiates septate, arcuate, bicornuate uterus and deep infiltrating endometriosis'),
  ('lab_test', null, 'Saline Infusion Sonohysterography (SIS / Saline Hysterography)', 'Ultrasound & Imaging Procedures', '📸 Cavity SIS', 'Distends cavity with saline to delineate endometrial polyps, submucosal fibroids, adhesions'),
  ('lab_test', null, 'Hysterosalpingography (HSG - Fluoroscopic Tubal Patency)', 'Ultrasound & Imaging Procedures', '📸 HSG Tubal Test', 'Performed Day 7 to Day 10 of cycle to verify bilateral fallopian tube spill and contour'),
  ('lab_test', null, 'Pelvic MRI with Contrast (Endometriosis & Fibroid Mapping)', 'Ultrasound & Imaging Procedures', '🧲 Pelvic MRI', 'Precision pre-surgical mapping for deep infiltrating endometriosis (DIE) and rectovaginal septum'),
  ('lab_test', null, 'Digital Bilateral Mammography (Low-Dose Breast Screen)', 'Ultrasound & Imaging Procedures', '📸 Mammogram', 'Annual or biennial breast cancer screen for women aged 40 and older'),
  ('lab_test', null, 'High-Resolution Sonomammography (Bilateral Breast Ultrasound)', 'Ultrasound & Imaging Procedures', '📸 Breast Ultrasound', 'Preferred modality for dense breasts and differentiating cystic from solid breast nodules'),
  ('lab_test', null, 'DEXA Bone Mineral Density Scan (Dual Energy X-Ray Absorptiometry)', 'Ultrasound & Imaging Procedures', '🦴 Bone Density DEXA', 'Evaluates T-score and Z-score of lumbar spine (L1-L4) and femoral neck for osteoporosis')
on conflict do nothing;


-- ==========================================
-- MIGRATION: 0042_landing_settings.sql
-- ==========================================

CREATE TABLE landing_settings (
  id INT PRIMARY KEY DEFAULT 1,
  hero_title TEXT NOT NULL,
  hero_subtitle TEXT NOT NULL,
  provider_hero_title TEXT NOT NULL,
  provider_hero_subtitle TEXT NOT NULL,
  pricing_amount INT NOT NULL DEFAULT 799,
  promo_text TEXT,
  toggles JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT singleton CHECK (id = 1)
);

INSERT INTO landing_settings (id, hero_title, hero_subtitle, provider_hero_title, provider_hero_subtitle, pricing_amount, promo_text, toggles)
VALUES (
  1,
  'Your Premier Partner in Women''s Health',
  'Empowering women through comprehensive, compassionate, and cutting-edge medical care. Book consultations instantly.',
  'Empower Your Practice with HealNari',
  'Join the leading digital platform for women''s endocrinology and reproductive health. Focus on what you do best—delivering world-class clinical outcomes—while our AI EMR and automated patient acquisition handles the rest.',
  799,
  'Use code HEALTH20 for 20% off your first consultation!',
  '{"showEmergencyBanner": false, "showFeaturedDoctors": true, "showTestimonials": true, "showPricing": false, "showNewsletter": true, "showProviderTestimonials": true, "showProviderCalculator": true, "showProviderComparison": true}'
);


-- ==========================================
-- MIGRATION: 0043_cron_automation_fields.sql
-- ==========================================

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


-- ==========================================
-- MIGRATION: 0044_clinical_protocols.sql
-- ==========================================

﻿-- Migration 0044: Clinical Protocol Bundles Table
-- Stores multi-drug evidence-based protocol presets for the doctor prescription panel.
-- Each row = one complete protocol bundle (many medicines, labs, diagnosis, clinical notes).

create table if not exists public.clinical_protocols (
  id            uuid primary key default gen_random_uuid(),
  doctor_id     uuid references public.profiles(id) on delete cascade,
  name          text not null,
  short_name    text,
  category      text not null default 'General',
  badge         text,
  description   text,
  diagnosis     text,
  meds          jsonb not null default '[]',
  labs          jsonb not null default '[]',
  clinical_notes text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create index if not exists clinical_protocols_doctor_idx on public.clinical_protocols (doctor_id) where deleted_at is null;
create index if not exists clinical_protocols_category_idx on public.clinical_protocols (category) where deleted_at is null;
create index if not exists clinical_protocols_active_idx on public.clinical_protocols (is_active) where deleted_at is null;

alter table public.clinical_protocols enable row level security;

create policy "Users can view global or own protocols"
  on public.clinical_protocols for select
  using (
    deleted_at is null and is_active = true and (
      doctor_id is null or
      doctor_id = auth.uid() or
      exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    )
  );

create policy "Doctors and Admins can create protocols"
  on public.clinical_protocols for insert
  with check (
    (doctor_id = auth.uid()) or
    (doctor_id is null and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  );

create policy "Doctors and Admins can update own protocols"
  on public.clinical_protocols for update
  using (
    doctor_id = auth.uid() or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Doctors and Admins can delete own protocols"
  on public.clinical_protocols for delete
  using (
    doctor_id = auth.uid() or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- SEED: 5 Evidence-Based Women's Health Protocol Bundles
insert into public.clinical_protocols (doctor_id, name, short_name, category, badge, description, diagnosis, meds, labs, clinical_notes) values
  (null, '🌸 PCOS Insulin-Sensitizing & Metabolic Protocol', 'PCOS First-Line', 'PCOS', '1st-Line Metabolic',
   'Evidence-based combination of Metformin ER, Myo-Inositol (40:1), and Vitamin D3 repletion for PCOS with insulin resistance.',
   'Polycystic Ovary Syndrome (PCOS) — Insulin Resistant Phenotype',
   '[{"name":"Metformin ER 500mg","schedule":"1-0-1","duration":"30 Days","timing":"After Food","instructions":"Take strictly after meals to minimize GI disturbance."},{"name":"Myo-Inositol & D-Chiro Inositol (40:1) 2g Sachet","schedule":"1-0-0","duration":"30 Days","timing":"Before Food","instructions":"Dissolve in 200ml lukewarm water on empty stomach."},{"name":"Vitamin D3 60,000 IU Capsule","schedule":"1-0-0","duration":"8 Weeks","timing":"After Food","instructions":"Take 1 capsule once weekly on Sundays after breakfast."}]',
   '["LH & FSH Ratio (PCOS Marker)","Serum AMH (Anti-Müllerian Hormone / Ovarian Reserve)","Fasting Blood Glucose (FBG)","Fasting Insulin & HOMA-IR (Insulin Resistance Index)","Total Serum Testosterone"]',
   'Patient evaluated for PCOS phenotype. Advised low glycemic diet, daily 30-minute brisk walk. Review with hormone and fasting insulin reports in 6 weeks.'),

  (null, '🌺 Fertility & Ovulation Induction Protocol', 'Fertility Boost', 'Fertility', 'Ovulation Induction',
   'Letrozole-based ovulation induction with trigger support and luteal phase supplementation for anovulatory infertility.',
   'Anovulatory Infertility — Oligo/Amenorrhea with PCOS',
   '[{"name":"Letrozole 2.5mg","schedule":"0-0-1","duration":"5 Days","timing":"Night (Day 2 to Day 6)","instructions":"Start Day 2 of menses. Monitor follicle growth with TVS on Day 10-12."},{"name":"Micronized Natural Progesterone (Oral/Vaginal) 200mg","schedule":"0-0-1","duration":"15 Days","timing":"Bedtime","instructions":"Start Day 15 after ovulation confirmation for luteal support."},{"name":"Folic Acid 5mg","schedule":"1-0-0","duration":"90 Days","timing":"After Breakfast","instructions":"Essential pre-conception supplement."}]',
   '["Serum AMH (Anti-Müllerian Hormone / Ovarian Reserve)","LH (Luteinizing Hormone)","FSH (Follicle Stimulating Hormone)","Serum Progesterone (Day 21 / Mid-Luteal Phase)","Pelvic Ultrasound (TVS) — Antral Follicle Count"]',
   'Ovulation induction cycle initiated. Serial TVS monitoring required. Mid-luteal progesterone to confirm ovulation.'),

  (null, '🩸 Dysmenorrhea & Heavy Flow Protocol', 'Menorrhagia Relief', 'Menstrual Health', 'Acute Flow Control',
   'Tranexamic acid + Mefenamic acid combination with iron replenishment for acute menorrhagia and severe dysmenorrhea.',
   'Acute Menorrhagia with Primary Dysmenorrhea',
   '[{"name":"Tranexamic Acid 500mg","schedule":"1-1-1","duration":"4 Days","timing":"During Heavy Bleeding Only","instructions":"Take only during active heavy bleeding days. Do not take prophylactically."},{"name":"Mefenamic Acid 500mg","schedule":"1-0-1","duration":"5 Days","timing":"After Food (SOS Pain)","instructions":"Take at onset of cramps with food or milk."},{"name":"Ferrous Ascorbate 100mg + Folic Acid 1.5mg + Zinc","schedule":"0-0-1","duration":"30 Days","timing":"2h after dinner or at bedtime","instructions":"Do not take with milk or tea. Orange juice enhances absorption."}]',
   '["Complete Blood Count (CBC) with Differential","Serum Ferritin & Iron Studies (TIBC)","Pelvic Ultrasound (USG Abdomen/Pelvis)","Coagulation Profile (PT, aPTT, INR)"]',
   'Acute menorrhagia management counseled. If bleeding exceeds 7 days or Hb drops below 8 g/dL, present to emergency immediately.'),

  (null, '🛡️ UTI Fast Relief Protocol', 'UTI First-Line', 'UTI & Bladder', 'Acute Cystitis',
   'Nitrofurantoin-based first-line UTI management with urinary alkalizer for immediate dysuria relief.',
   'Acute Uncomplicated Urinary Tract Infection (Cystitis)',
   '[{"name":"Nitrofurantoin 100mg Sustained Release (Macrobid)","schedule":"1-0-1","duration":"5 Days","timing":"With Food or Milk","instructions":"Take with food. Complete the full 5-day course."},{"name":"Disodium Hydrogen Citrate Syrup","schedule":"1-1-1","duration":"5 Days","timing":"Diluted in a glass of water","instructions":"Mix 15ml in a full glass of water. Relieves burning."},{"name":"Cranberry Extract + D-Mannose + Potassium Citrate Sachet","schedule":"1-0-1","duration":"15 Days","timing":"Dissolved in full glass of water","instructions":"Prevents E. coli adhesion. Drink 3+ litres of water daily."}]',
   '["Urine Routine & Microscopy (Midstream Clean Catch)","Urine Culture & Sensitivity (C/S)","Serum Creatinine & BUN (Renal Function)"]',
   'Acute uncomplicated cystitis managed empirically. Complete the antibiotic course. Escalate to IV antibiotics if fever or flank pain develop.'),

  (null, '🦋 Thyroid Balance & Replacement Protocol', 'Thyroid First-Line', 'Thyroid', 'Hypothyroidism Rx',
   'Levothyroxine titration protocol with Selenium support for Hashimoto thyroiditis.',
   'Primary Hypothyroidism / Hashimoto Thyroiditis',
   '[{"name":"Levothyroxine Sodium 50mcg","schedule":"1-0-0","duration":"90 Days","timing":"Strictly Empty Stomach Morning","instructions":"Take with plain water only. Wait 45-60 mins before tea or food. 4h gap from iron/calcium."},{"name":"Vitamin D3 (Cholecalciferol) 60,000 IU Capsule","schedule":"1-0-0","duration":"8 Weeks","timing":"With fatty meal or warm milk","instructions":"Take once weekly on the same day every week."}]',
   '["Complete Thyroid Profile (TSH, FT3, FT4)","Anti-TPO Antibodies (Thyroid Peroxidase / Hashimoto'\''s)","Anti-Thyroglobulin (Anti-Tg) Antibodies","25-OH Vitamin D (Serum Vitamin D3 Level)","Lipid Profile (Cholesterol, LDL, HDL, TG)"]',
   'Hypothyroidism management initiated. Target TSH: 1.0-2.5 mIU/L. Re-check TSH and FT4 in 6-8 weeks for dose adjustment.')

on conflict do nothing;

-- Auto-update updated_at timestamp
create or replace function public.update_clinical_protocol_timestamp()
returns trigger language plpgsql as 
begin
  new.updated_at = now();
  return new;
end;
;

create trigger clinical_protocols_updated_at
  before update on public.clinical_protocols
  for each row execute function public.update_clinical_protocol_timestamp();


-- ==========================================
-- MIGRATION: 0045_specialties_management.sql
-- ==========================================

-- Migration: Add specialties management table
CREATE TABLE if not exists public.specialties (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- Insert default specialties
INSERT INTO public.specialties (name)
VALUES 
  ('Gynaecologist'), 
  ('Endocrinologist'), 
  ('Trichologist')
ON CONFLICT (name) DO NOTHING;

-- Enable RLS
ALTER TABLE public.specialties ENABLE ROW LEVEL SECURITY;

-- Allow public read access to anyone
CREATE POLICY "Allow public read access to specialties"
ON public.specialties FOR SELECT TO public USING (true);

-- Allow admins all operations on specialties
CREATE POLICY "Allow admin all operations on specialties"
ON public.specialties FOR ALL TO authenticated
USING (public.current_app_role() = 'admin')
WITH CHECK (public.current_app_role() = 'admin');


-- ==========================================
-- MIGRATION: 0046_notification_preferences_and_hardening.sql
-- ==========================================

-- Migration 0046: Complete Notification Preferences, Hardening, Idempotency & Privacy
-- Adds notification_preferences table, idempotency_key to notifications, and metadata to push_subscriptions.

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  appointment_reminders boolean not null default true,
  doctor_messages boolean not null default true,
  consultation_updates boolean not null default true,
  health_reminders boolean not null default true,
  medication_reminders boolean not null default true,
  cycle_reminders boolean not null default true,
  marketing_notifications boolean not null default false,
  sound_enabled boolean not null default true,
  quiet_hours_enabled boolean not null default false,
  quiet_hours_start text not null default '22:00',
  quiet_hours_end text not null default '07:00',
  timezone text not null default 'Asia/Kolkata',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notif_prefs_user_idx on public.notification_preferences (user_id);

alter table public.notification_preferences enable row level security;

-- Policies for notification_preferences
create policy "notification_preferences_owner_select" on public.notification_preferences
  for select using (user_id = auth.uid());

create policy "notification_preferences_owner_insert" on public.notification_preferences
  for insert with check (user_id = auth.uid());

create policy "notification_preferences_owner_update" on public.notification_preferences
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

grant usage on schema public to authenticated;
grant select, insert, update on public.notification_preferences to authenticated;

-- Enhance notifications table with idempotency, category, sensitivity, and lifecycle tracking
alter table public.notifications
  add column if not exists idempotency_key text,
  add column if not exists category text default 'general',
  add column if not exists sensitivity text default 'low',
  add column if not exists status text default 'delivered',
  add column if not exists delivered_at timestamptz,
  add column if not exists opened_at timestamptz;

create index if not exists notifications_idempotency_idx on public.notifications (user_id, idempotency_key);

-- Enhance push_subscriptions table with metadata and status
alter table public.push_subscriptions
  add column if not exists user_agent text,
  add column if not exists platform text,
  add column if not exists status text default 'active',
  add column if not exists last_seen_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();


-- ==========================================
-- MIGRATION: 0047_multi_currency_financial_ledger.sql
-- ==========================================

-- 0047_multi_currency_financial_ledger.sql
-- Production-grade multi-currency financial ledger columns, FX tracking, and revenue reconciliation RPCs

-- 1. Extend payments table with immutable original currency and reporting conversion columns
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS original_amount numeric(12, 2);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS original_currency text DEFAULT 'INR';

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS reporting_amount numeric(12, 2);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS reporting_currency text DEFAULT 'USD';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS fx_rate numeric(14, 6) DEFAULT 1.0;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS fx_rate_source text DEFAULT 'configured_matrix';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS fx_rate_timestamp timestamptz DEFAULT now();

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS platform_fee_amount numeric(12, 2) DEFAULT 0.00;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS platform_fee_currency text DEFAULT 'INR';

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS provider_payout_amount numeric(12, 2) DEFAULT 0.00;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS provider_payout_currency text DEFAULT 'INR';

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS refund_amount numeric(12, 2) DEFAULT 0.00;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS refund_currency text DEFAULT 'INR';

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS tax_amount numeric(12, 2) DEFAULT 0.00;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS tax_currency text DEFAULT 'INR';

-- Backfill original_amount and original_currency for existing payment records if null
UPDATE public.payments
SET 
  original_amount = COALESCE(original_amount, amount),
  original_currency = COALESCE(original_currency, currency, 'INR'),
  platform_fee_amount = COALESCE(platform_fee_amount, ROUND(amount * 0.10, 2)),
  platform_fee_currency = COALESCE(platform_fee_currency, currency, 'INR'),
  provider_payout_amount = COALESCE(provider_payout_amount, ROUND(amount * 0.90, 2)),
  provider_payout_currency = COALESCE(provider_payout_currency, currency, 'INR'),
  reporting_currency = COALESCE(reporting_currency, 'USD')
WHERE original_amount IS NULL;

-- 2. Extend payouts table
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS original_amount numeric(12, 2);
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS original_currency text DEFAULT 'INR';
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS reference_id text;

UPDATE public.payouts
SET 
  original_amount = COALESCE(original_amount, amount),
  original_currency = COALESCE(original_currency, currency, 'INR')
WHERE original_amount IS NULL;

-- 3. Extend refund_requests table
ALTER TABLE public.refund_requests ADD COLUMN IF NOT EXISTS refund_currency text DEFAULT 'INR';
ALTER TABLE public.refund_requests ADD COLUMN IF NOT EXISTS reporting_refund_amount numeric(12, 2);
ALTER TABLE public.refund_requests ADD COLUMN IF NOT EXISTS reporting_currency text DEFAULT 'USD';
ALTER TABLE public.refund_requests ADD COLUMN IF NOT EXISTS fx_rate numeric(14, 6) DEFAULT 1.0;

-- 4. Multi-currency performance indexes
CREATE INDEX IF NOT EXISTS idx_payments_status_currency ON public.payments (status, original_currency);
CREATE INDEX IF NOT EXISTS idx_payments_created_at_status ON public.payments (created_at, status);
CREATE INDEX IF NOT EXISTS idx_payments_doctor_status ON public.payments (doctor_id, status);
CREATE INDEX IF NOT EXISTS idx_payouts_doctor_status ON public.payouts (doctor_id, status);

-- 5. Updated multi-currency dashboard revenue aggregator RPC
CREATE OR REPLACE FUNCTION get_dashboard_revenue_multi_currency(p_target_currency text DEFAULT 'USD')
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_revenue numeric := 0;
BEGIN
  -- Sum up reporting_amount where available, or convert using default matrix
  SELECT COALESCE(SUM(
    CASE 
      WHEN p.status = 'Paid' AND p.reporting_amount IS NOT NULL AND p.reporting_currency = p_target_currency THEN p.reporting_amount
      WHEN p.status = 'Paid' AND p.currency = 'USD' AND p_target_currency = 'USD' THEN p.amount
      WHEN p.status = 'Paid' AND p.currency = 'INR' AND p_target_currency = 'USD' THEN ROUND(p.amount * 0.01182, 2)
      WHEN p.status = 'Paid' AND p.currency = 'AED' AND p_target_currency = 'USD' THEN ROUND(p.amount * 0.2723, 2)
      WHEN p.status = 'Paid' AND p.currency = 'EUR' AND p_target_currency = 'USD' THEN ROUND(p.amount * 1.085, 2)
      WHEN p.status = 'Paid' AND p.currency = 'GBP' AND p_target_currency = 'USD' THEN ROUND(p.amount * 1.28, 2)
      WHEN p.status = 'Paid' AND p.currency = p_target_currency THEN p.amount
      ELSE p.amount
    END
  ), 0) INTO v_total_revenue
  FROM payments p
  WHERE p.status = 'Paid';
  
  RETURN v_total_revenue;
END;
$$;


-- ==========================================
-- SEED DATA
-- ==========================================

-- Optional demo data — fills in clinical detail for real accounts you've
-- already created through the app's own sign-up flow.
--
-- Why not seed auth.users directly? Faking a password hash + identity row
-- for auth.users is fragile and drifts across Supabase/GoTrue versions.
-- Signing up for real through the app is one extra minute and guaranteed
-- to work.
--
-- Steps:
--   1. Run the app, sign up ONE doctor account and a few patient accounts
--      through the real signup form (Doctor: e.g. sarah.mitchell@example.com;
--      Patients: priya@example.com, anita@example.com, kavita@example.com …).
--      handle_new_user() (see migration 0001) already created their
--      profiles + patient_records rows with a real MRN.
--   2. Replace the placeholder emails below with the ones you used.
--   3. Run this file in the Supabase SQL editor.

do $$
declare
  v_doctor_id uuid;
  v_priya_id uuid;
  v_anita_id uuid;
  v_kavita_id uuid;
begin
  select id into v_doctor_id from auth.users where email = 'sarah.mitchell@example.com';
  select id into v_priya_id  from auth.users where email = 'priya@example.com';
  select id into v_anita_id  from auth.users where email = 'anita@example.com';
  select id into v_kavita_id from auth.users where email = 'kavita@example.com';

  if v_doctor_id is null or v_priya_id is null then

  -- Create auth.users manually using pgcrypto so you don't have to sign up first
  create extension if not exists pgcrypto;

  if not exists (select 1 from auth.users where email = 'sarah.mitchell@example.com') then
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
    values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sarah.mitchell@example.com', crypt('Password123!', gen_salt('bf')), now(), '{"role": "doctor", "full_name": "Dr. Sarah Mitchell"}', now(), now(), '', '', '', '');
  end if;

  if not exists (select 1 from auth.users where email = 'priya@example.com') then
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
    values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'priya@example.com', crypt('Password123!', gen_salt('bf')), now(), '{"role": "patient", "full_name": "Priya Sharma"}', now(), now(), '', '', '', '');
  end if;

  if not exists (select 1 from auth.users where email = 'anita@example.com') then
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
    values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'anita@example.com', crypt('Password123!', gen_salt('bf')), now(), '{"role": "patient", "full_name": "Anita Desai"}', now(), now(), '', '', '', '');
  end if;

  if not exists (select 1 from auth.users where email = 'kavita@example.com') then
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
    values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'kavita@example.com', crypt('Password123!', gen_salt('bf')), now(), '{"role": "patient", "full_name": "Kavita Patel"}', now(), now(), '', '', '', '');
  end if;

    select id into v_doctor_id from auth.users where email = 'sarah.mitchell@example.com';
    select id into v_priya_id  from auth.users where email = 'priya@example.com';
    select id into v_anita_id  from auth.users where email = 'anita@example.com';
    select id into v_kavita_id from auth.users where email = 'kavita@example.com';
  end if;

  -- Doctor profile detail
  update public.profiles
  set specialty = 'Gynaecologist', registration_no = 'KMC-84920', kyc_verified = true
  where id = v_doctor_id;

  -- Priya Sharma — richer clinical identity
  update public.patient_records
  set dob = '1996-05-14', blood_group = 'B+',
      allergies = array['Penicillin', 'Sulfa Drugs'],
      chronic_conditions = array['Polycystic Ovary Syndrome (PCOS)', 'Subclinical Hypothyroidism'],
      primary_doctor_id = v_doctor_id
  where patient_id = v_priya_id;

  -- Today's queue: one in progress, one waiting, one upcoming
  insert into public.appointments (patient_id, doctor_id, specialty, type, scheduled_date, scheduled_time, reason, status)
  values
    (v_priya_id, v_doctor_id, 'Gynaecology', 'clinic', current_date, '09:30 AM', 'PCOS Follow-up', 'In Progress');

  if v_anita_id is not null then
    insert into public.appointments (patient_id, doctor_id, specialty, type, scheduled_date, scheduled_time, reason, status)
    values (v_anita_id, v_doctor_id, 'Gynaecology', 'video', current_date, '10:00 AM', 'Fertility Consult', 'Waiting');
  end if;

  if v_kavita_id is not null then
    insert into public.appointments (patient_id, doctor_id, specialty, type, scheduled_date, scheduled_time, reason, status)
    values (v_kavita_id, v_doctor_id, 'Gynaecology', 'clinic', current_date + 2, '10:30 AM', 'Irregular Cycles', 'Upcoming');

    -- The refill Kavita is actually on, correctly flagged this time.
    insert into public.prescriptions (patient_id, doctor_id, med_name, dosage, schedule, duration, refills_left, status, instructions, valid_till, refill_requested)
    values (v_kavita_id, v_doctor_id, 'Norethisterone', '5mg', '1-0-0', '10 Days', 1, 'Active', 'Take for 10 days. Bleed expected 2-4 days after stopping.', current_date + 10, true);
  end if;

  -- Priya's active prescriptions
  insert into public.prescriptions (patient_id, doctor_id, med_name, dosage, schedule, duration, refills_left, status, instructions, valid_till)
  values
    (v_priya_id, v_doctor_id, 'Metformin', '500mg', '1-0-1', '30 Days', 2, 'Active', 'Take after meals to reduce GI disturbance.', current_date + 20),
    (v_priya_id, v_doctor_id, 'Myo-Inositol Sachet', '2g', '1-0-0', '30 Days', 2, 'Active', 'Dissolve in 200ml water on empty stomach.', current_date + 20);

  -- A cycle log so the doctor-visible read path has something to show
  insert into public.cycle_logs (patient_id, log_date, phase, flow, cramps, mood, symptoms)
  values (v_priya_id, current_date, 'ovulation', 'light', 2, 'good', array['Bloating'])
  on conflict (patient_id, log_date) do nothing;

  raise notice 'Seed complete.';
end $$;
