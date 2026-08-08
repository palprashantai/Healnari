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
