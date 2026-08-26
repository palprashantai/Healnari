-- Adds 'Approved' as a valid appointments.status value for the awaiting-payment flow.

alter table public.appointments
  drop constraint appointments_status_check;

alter table public.appointments
  add constraint appointments_status_check
  check (status in ('Requested', 'Approved', 'Upcoming', 'Waiting', 'In Progress', 'Done', 'No Show', 'Cancelled'));
