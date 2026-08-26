-- Adds doctor_schedules, doctor_exceptions, and updates appointments for HOLD status

create table public.doctor_schedules (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.profiles(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6), -- 0=Sunday, 6=Saturday
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.doctor_exceptions (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.profiles(id) on delete cascade,
  exception_date date not null,
  is_available boolean not null default false,
  created_at timestamptz not null default now()
);

create index doctor_schedules_doctor_idx on public.doctor_schedules(doctor_id, day_of_week);
create index doctor_exceptions_doctor_idx on public.doctor_exceptions(doctor_id, exception_date);

-- Add HOLD status and hold_expires_at to appointments
alter table public.appointments drop constraint appointments_status_check;

alter table public.appointments
  add constraint appointments_status_check
  check (status in ('Requested', 'Approved', 'HOLD', 'Upcoming', 'Waiting', 'In Progress', 'Done', 'No Show', 'Cancelled'));

alter table public.appointments add column hold_expires_at timestamptz;

-- Insert a default schedule for existing doctors (Mon-Fri, 09:00 - 17:00)
insert into public.doctor_schedules (doctor_id, day_of_week, start_time, end_time)
select p.id, d, '09:00:00'::time, '17:00:00'::time
from public.profiles p
cross join unnest(array[1,2,3,4,5]) as d
where p.role = 'doctor';
