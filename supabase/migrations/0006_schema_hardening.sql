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
