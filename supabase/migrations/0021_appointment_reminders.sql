-- Tracks whether a pre-appointment reminder has already gone out, so the
-- reminder cron (AppointmentsService.sendUpcomingReminders) doesn't
-- re-notify the same patient every time it runs.
alter table public.appointments
  add column if not exists reminder_sent_at timestamptz;
