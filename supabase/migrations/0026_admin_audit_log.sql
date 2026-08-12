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
