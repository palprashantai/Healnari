-- Two patients booking the same doctor/date/time concurrently both
-- succeeded — appointments.create() never checked for a conflict, and the
-- ERROR_MESSAGES.APPOINTMENT_CONFLICT string existed but was never thrown
-- anywhere. GET .../slots already filtered out booked times client-side,
-- but that's a UI nicety, not a guarantee: two requests racing between
-- "fetch available slots" and "book" could both pass that check. A DB
-- constraint is the only thing that's actually race-proof.
create unique index if not exists appointments_no_double_booking
  on public.appointments (doctor_id, scheduled_date, scheduled_time)
  where status not in ('Cancelled', 'No Show');
