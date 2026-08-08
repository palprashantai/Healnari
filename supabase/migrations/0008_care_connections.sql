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
