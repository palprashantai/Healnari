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
