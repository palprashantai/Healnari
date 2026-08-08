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
