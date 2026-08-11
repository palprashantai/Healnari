-- Web Push subscriptions — one row per browser/device a user has granted
-- notification permission on. Backs delivery of incoming-call alerts (and
-- other notifications) via the Push API even when the app tab is closed or
-- backgrounded. Written only by the backend's service-role client, on
-- behalf of the authenticated caller registering their own browser — see
-- NotificationsService.create(), which fans a notification out here after
-- writing to public.notifications and emitting over the socket gateway.

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- Only the backend's service-role client inserts/deletes (it resolves the
-- caller's identity itself) — no insert policy for authenticated users.
-- Owners can read and remove their own subscriptions.
create policy "push_subscriptions_owner_select" on public.push_subscriptions
  for select using (user_id = auth.uid());

create policy "push_subscriptions_owner_delete" on public.push_subscriptions
  for delete using (user_id = auth.uid());

grant usage on schema public to authenticated;
grant select, delete on public.push_subscriptions to authenticated;
