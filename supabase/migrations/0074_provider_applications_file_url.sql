-- Migration: Add license_file_url to provider_applications
alter table public.provider_applications add column if not exists license_file_url text;
