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
