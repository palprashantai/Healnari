-- Migration: provider_applications
-- Stores pre-registration specialist applications from the public landing page.
-- Admin sees these in the verification queue alongside existing unverified doctor profiles.

create table if not exists public.provider_applications (
  id                uuid        primary key default gen_random_uuid(),
  full_name         text        not null,
  email             text        not null,
  phone             text        not null,
  country_code      text        not null default 'IN',
  registration_no   text        not null,
  medical_council   text        not null,
  specialty         text        not null,
  experience_years  text        not null,
  consultation_fee  text,
  clinic_name       text,
  license_file_name text,
  license_file_size text,
  license_file_type text,
  status            text        not null default 'pending'
                                check (status in ('pending', 'reviewing', 'approved', 'rejected')),
  admin_notes       text,
  submitted_at      timestamptz not null default now(),
  reviewed_at       timestamptz,
  created_at        timestamptz not null default now()
);

create index if not exists provider_applications_status_idx
  on public.provider_applications (status, submitted_at desc);

create index if not exists provider_applications_email_idx
  on public.provider_applications (email);

alter table public.provider_applications enable row level security;

-- Anyone (including unauthenticated visitors from the landing page) can submit
drop policy if exists "provider_applications_insert_anon" on public.provider_applications;
create policy "provider_applications_insert_anon"
  on public.provider_applications
  for insert to anon, authenticated
  with check (true);

-- Only admins can read / update applications
drop policy if exists "provider_applications_select_admin" on public.provider_applications;
create policy "provider_applications_select_admin"
  on public.provider_applications
  for select to authenticated
  using (current_app_role() = 'admin');

drop policy if exists "provider_applications_update_admin" on public.provider_applications;
create policy "provider_applications_update_admin"
  on public.provider_applications
  for update to authenticated
  using (current_app_role() = 'admin');

grant insert on public.provider_applications to anon;
grant select, insert, update on public.provider_applications to authenticated;
