-- AUDIT_REPORT.md DB-2 — this is not just a UAE-readiness gap, it is a
-- currently-active bug confirmed live this session: inserting an
-- appointment for "10:30 AM" produced scheduled_at = 2026-08-20T10:30:00+00
-- (UTC) instead of the correct 2026-08-20T05:00:00+00 (10:30 IST converted
-- to UTC). Every reminder/delay-notification comparison against real UTC
-- now() has therefore been running ~5.5 hours off for every appointment on
-- the platform — not a future-market problem, a live one.
--
-- Root cause: sync_appointment_scheduled_at() (migration 0006) cast the
-- date+time text straight to `timestamp` and let it fall into the
-- `timestamptz` column using the DB session's timezone (UTC), instead of
-- explicitly interpreting it in the doctor's own timezone.

alter table public.profiles add column if not exists timezone text not null default 'Asia/Kolkata';

create or replace function public.sync_appointment_scheduled_at()
returns trigger language plpgsql as $$
declare
  doctor_tz text;
begin
  select timezone into doctor_tz from public.profiles where id = new.doctor_id;
  new.scheduled_at := (new.scheduled_date::text || ' ' || new.scheduled_time)::timestamp
    at time zone coalesce(doctor_tz, 'Asia/Kolkata');
  return new;
end;
$$;

-- Re-derive every existing row with the corrected logic — these were all
-- computed with the buggy trigger, so this is a real correction, not a
-- backfill of nulls.
update public.appointments a
set scheduled_at = (a.scheduled_date::text || ' ' || a.scheduled_time)::timestamp
  at time zone coalesce((select p.timezone from public.profiles p where p.id = a.doctor_id), 'Asia/Kolkata');

-- AUDIT_REPORT.md DB-3 — no currency field existed anywhere; every amount
-- implicitly assumed INR. Adding the column now (all existing/new rows
-- default to 'INR', matching current real-world behavior exactly) so
-- billing code can start threading a real currency through without a
-- second migration once UAE/AED pricing is actually wired up.
alter table public.payments add column if not exists currency text not null default 'INR';
alter table public.profiles add column if not exists currency text not null default 'INR';
alter table public.payouts add column if not exists currency text not null default 'INR';
alter table public.refund_requests add column if not exists currency text not null default 'INR';
