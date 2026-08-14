create table if not exists public.phi_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  target_patient_id uuid references public.profiles(id) on delete set null,
  actor_role text not null,
  action text not null,
  resource text not null,
  status text not null,
  ip_address text,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists phi_audit_logs_actor_idx on public.phi_audit_logs (actor_id);
create index if not exists phi_audit_logs_patient_idx on public.phi_audit_logs (target_patient_id);
create index if not exists phi_audit_logs_resource_idx on public.phi_audit_logs (resource);
create index if not exists phi_audit_logs_created_idx on public.phi_audit_logs (created_at desc);

alter table public.phi_audit_logs enable row level security;

do $$ 
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'phi_audit_logs' and policyname = 'phi_audit_logs_select_admin'
  ) then
    create policy "phi_audit_logs_select_admin" on public.phi_audit_logs
      for select to authenticated using (current_app_role() = 'admin');
  end if;
end $$;

do $$ 
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'phi_audit_logs' and policyname = 'phi_audit_logs_select_patient'
  ) then
    create policy "phi_audit_logs_select_patient" on public.phi_audit_logs
      for select to authenticated using (auth.uid() = target_patient_id);
  end if;
end $$;

-- System (service role) writes to it, so no insert policy needed for authenticated users.
