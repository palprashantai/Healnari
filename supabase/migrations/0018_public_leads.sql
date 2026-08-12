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
