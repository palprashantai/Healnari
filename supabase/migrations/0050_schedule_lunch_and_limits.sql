-- Add lunch break and max bookings settings to doctor_schedules

-- Lunch break columns per day (nullable = no lunch break)
alter table public.doctor_schedules add column lunch_start time;
alter table public.doctor_schedules add column lunch_end time;

-- Max bookings per day (null = unlimited)
alter table public.doctor_schedules add column max_bookings_per_day int;
