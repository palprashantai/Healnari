-- The admin broadcast composer (Communications.jsx) has always had Email/Push
-- delivery-channel toggles, but the backend silently discarded them — every
-- broadcast was recorded as "Sent" with no record of what channel was
-- requested or how many real recipients it reached. These columns let the
-- backend record that honestly once it actually resolves the audience and
-- fans out a real push notification (see AdminService.sendBroadcast).
alter table public.broadcast_history
  add column if not exists channels text[] not null default '{}',
  add column if not exists recipient_count integer not null default 0;
