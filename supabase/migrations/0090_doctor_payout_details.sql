-- Add payout_details to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS payout_details JSONB DEFAULT '{}'::jsonb;
