-- SEC-1 fix: any KYC-verified doctor could read/write ANY patient's records
-- (lab reports, documents, vaccinations, emergency contacts, prescriptions,
-- clinical notes) regardless of ever having treated them — see
-- AUDIT_REPORT.md SEC-1 / DB-7. The application-layer fix scopes doctor
-- access to patients they have an actual appointment with; this column
-- covers the one legitimate case that wouldn't otherwise have an
-- appointment yet — a doctor manually registering a walk-in patient
-- (PatientsService.create()) before any appointment exists.
alter table public.patient_records add column if not exists created_by_doctor_id uuid references public.profiles(id) on delete set null;

-- DB-6 fix: these two policies granted blanket select/update to ANY
-- authenticated user (using (true)) even though RLS here is defense-in-depth
-- only (the app always talks to Postgres via the service-role client) — see
-- AUDIT_REPORT.md DB-6. Neither table has a real end-user insert path in the
-- application (both are only ever written by backend services), so both are
-- tightened to admin-only, matching the access pattern actually in use.
drop policy if exists "support_tickets_select_all" on public.support_tickets;
drop policy if exists "support_tickets_insert_all" on public.support_tickets;
drop policy if exists "support_tickets_update_admin" on public.support_tickets;
create policy "support_tickets_select_admin" on public.support_tickets
  for select to authenticated using (current_app_role() = 'admin');
create policy "support_tickets_insert_admin" on public.support_tickets
  for insert to authenticated with check (current_app_role() = 'admin');
create policy "support_tickets_update_admin" on public.support_tickets
  for update to authenticated using (current_app_role() = 'admin');

drop policy if exists "refund_requests_select_all" on public.refund_requests;
drop policy if exists "refund_requests_insert_all" on public.refund_requests;
drop policy if exists "refund_requests_update_admin" on public.refund_requests;
create policy "refund_requests_select_own_or_admin" on public.refund_requests
  for select to authenticated using (current_app_role() = 'admin' or patient_id = auth.uid());
create policy "refund_requests_insert_admin" on public.refund_requests
  for insert to authenticated with check (current_app_role() = 'admin');
create policy "refund_requests_update_admin" on public.refund_requests
  for update to authenticated using (current_app_role() = 'admin');
