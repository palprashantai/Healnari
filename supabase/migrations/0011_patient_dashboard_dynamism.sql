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
