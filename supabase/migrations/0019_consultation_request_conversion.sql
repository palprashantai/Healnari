-- Lets a public consultation request name a specific real doctor (not just
-- a specialty label) and, once that doctor approves it, links to the real
-- patient account + appointment the approval created — so the request
-- can't be double-converted and the admin Leads view can show what it
-- turned into.
alter table public.consultation_requests
  add column if not exists email text,
  add column if not exists doctor_id uuid references public.profiles(id),
  add column if not exists patient_id uuid references public.profiles(id);

create index if not exists consultation_requests_doctor_idx on public.consultation_requests (doctor_id, status);
