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
