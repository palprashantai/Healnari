-- Migration 0082: Doctor reviews and patient ratings
create table if not exists public.doctor_reviews (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.profiles(id) on delete cascade,
  patient_id uuid references public.profiles(id) on delete set null,
  patient_name text not null,
  appointment_id uuid references public.appointments(id) on delete set null,
  rating integer not null check (rating >= 1 and rating <= 5),
  tags text[] default '{}',
  comment text,
  is_verified boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_doctor_reviews_doctor_id on public.doctor_reviews(doctor_id);
create index if not exists idx_doctor_reviews_patient_id on public.doctor_reviews(patient_id);
