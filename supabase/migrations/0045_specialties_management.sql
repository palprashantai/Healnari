-- Migration: Add specialties management table
CREATE TABLE if not exists public.specialties (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- Insert default specialties
INSERT INTO public.specialties (name)
VALUES 
  ('Gynaecologist'), 
  ('Endocrinologist'), 
  ('Trichologist')
ON CONFLICT (name) DO NOTHING;

-- Enable RLS
ALTER TABLE public.specialties ENABLE ROW LEVEL SECURITY;

-- Allow public read access to anyone
CREATE POLICY "Allow public read access to specialties"
ON public.specialties FOR SELECT TO public USING (true);

-- Allow admins all operations on specialties
CREATE POLICY "Allow admin all operations on specialties"
ON public.specialties FOR ALL TO authenticated
USING (public.current_app_role() = 'admin')
WITH CHECK (public.current_app_role() = 'admin');
