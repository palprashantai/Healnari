-- In-app notifications — backs the bell dropdown on both the patient and
-- doctor dashboards, which previously rendered a hardcoded local array.
-- Rows are written by the backend (service-role client) whenever something
-- notification-worthy happens (appointment approved/rejected/cancelled,
-- a new request comes in, a doctor sends a push broadcast); the same write
-- also fans out over the notifications socket gateway for a live toast, so
-- this table is the durable record a client (re)reads on load/reconnect.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  data jsonb not null default '{}'::jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

-- Only the backend's service-role client inserts (it resolves the recipient
-- itself, e.g. "the other party on this appointment") — no insert policy
-- for authenticated users. Owners can read and mark their own as read.
create policy "notifications_owner_select" on public.notifications
  for select using (user_id = auth.uid());

create policy "notifications_owner_update" on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

grant usage on schema public to authenticated;
grant select, update on public.notifications to authenticated;
