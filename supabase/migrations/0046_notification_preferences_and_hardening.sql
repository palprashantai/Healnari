-- Migration 0046: Complete Notification Preferences, Hardening, Idempotency & Privacy
-- Adds notification_preferences table, idempotency_key to notifications, and metadata to push_subscriptions.

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  appointment_reminders boolean not null default true,
  doctor_messages boolean not null default true,
  consultation_updates boolean not null default true,
  health_reminders boolean not null default true,
  medication_reminders boolean not null default true,
  cycle_reminders boolean not null default true,
  marketing_notifications boolean not null default false,
  sound_enabled boolean not null default true,
  quiet_hours_enabled boolean not null default false,
  quiet_hours_start text not null default '22:00',
  quiet_hours_end text not null default '07:00',
  timezone text not null default 'Asia/Kolkata',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notif_prefs_user_idx on public.notification_preferences (user_id);

alter table public.notification_preferences enable row level security;

-- Policies for notification_preferences
create policy "notification_preferences_owner_select" on public.notification_preferences
  for select using (user_id = auth.uid());

create policy "notification_preferences_owner_insert" on public.notification_preferences
  for insert with check (user_id = auth.uid());

create policy "notification_preferences_owner_update" on public.notification_preferences
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

grant usage on schema public to authenticated;
grant select, insert, update on public.notification_preferences to authenticated;

-- Enhance notifications table with idempotency, category, sensitivity, and lifecycle tracking
alter table public.notifications
  add column if not exists idempotency_key text,
  add column if not exists category text default 'general',
  add column if not exists sensitivity text default 'low',
  add column if not exists status text default 'delivered',
  add column if not exists delivered_at timestamptz,
  add column if not exists opened_at timestamptz;

create index if not exists notifications_idempotency_idx on public.notifications (user_id, idempotency_key);

-- Enhance push_subscriptions table with metadata and status
alter table public.push_subscriptions
  add column if not exists user_agent text,
  add column if not exists platform text,
  add column if not exists status text default 'active',
  add column if not exists last_seen_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();
