-- Idempotency guard for the delay-notification sweep
-- (AppointmentsService.sendDelayNotifications) — without it, every 5-minute
-- cron tick would re-notify the same still-delayed patient over and over.
alter table public.appointments
  add column if not exists delay_notified_at timestamptz;
