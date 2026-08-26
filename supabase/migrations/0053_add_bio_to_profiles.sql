-- Migration 0053: Add bio to profiles
-- Adds the 'bio' column which is used by doctors to write a short biography.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;
