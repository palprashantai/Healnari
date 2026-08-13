-- Migration 0030: International Country, Currency, and Payout Banking Support
-- Adds country, localized currency, and payout details across profiles, consultation_requests, and appointments

-- 1. Consultation Requests: Add country, currency, and fee fields for global patient bookings
alter table public.consultation_requests
  add column if not exists country text not null default 'US',
  add column if not exists currency text not null default 'USD',
  add column if not exists fee numeric(10, 2);

-- 2. Profiles: Add country and country-specific banking/payout configuration
alter table public.profiles
  add column if not exists country text not null default 'IN',
  add column if not exists payout_bank_details jsonb not null default '{}'::jsonb,
  add column if not exists medical_council text;

-- 3. Appointments: Track consultation country and currency for billing consistency
alter table public.appointments
  add column if not exists country text not null default 'IN',
  add column if not exists currency text not null default 'INR';

-- 4. Payments: Ensure country column exists for multi-gateway reconciliation (Stripe vs Cashfree)
alter table public.payments
  add column if not exists country text not null default 'IN',
  add column if not exists gateway text not null default 'Cashfree';

-- 5. Indexes for fast country and currency queries
create index if not exists consultation_requests_country_idx on public.consultation_requests (country, currency);
create index if not exists profiles_country_idx on public.profiles (country);
create index if not exists payments_currency_gateway_idx on public.payments (currency, gateway);
