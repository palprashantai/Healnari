-- Recreate the appointments_no_double_booking index to account for soft deletes.
-- If an appointment was soft-deleted (deleted_at IS NOT NULL), it should not block
-- a new appointment from being booked in the same slot.

drop index if exists appointments_no_double_booking;

create unique index appointments_no_double_booking
  on public.appointments (doctor_id, scheduled_date, scheduled_time)
  where status not in ('Cancelled', 'No Show') and deleted_at is null;
