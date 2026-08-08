-- Adds 'Requested' as a valid appointments.status value.
-- The patient-initiated booking flow creates rows in this state; a doctor's
-- approveRequest/rejectRequest action then promotes/cancels them.

alter table public.appointments
  drop constraint appointments_status_check;

alter table public.appointments
  add constraint appointments_status_check
  check (status in ('Requested', 'Upcoming', 'Waiting', 'In Progress', 'Done', 'No Show', 'Cancelled'));
