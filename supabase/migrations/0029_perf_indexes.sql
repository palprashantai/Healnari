-- Performance indexes for hot read paths.

-- Public doctor directory (doctors.service.ts search()) and admin user
-- listing (admin.service.ts getAllUsers()) both filter profiles by role
-- (+ kyc_verified for the public directory) on every call; profiles had
-- no index beyond the primary key.
create index if not exists profiles_role_kyc_idx on public.profiles (role, kyc_verified);

-- doctors.service.ts search() does `ilike('full_name', '%q%')` — a
-- leading-wildcard ILIKE can't use a plain btree index. pg_trgm + a GIN
-- index lets Postgres use a trigram index scan instead of a full table
-- scan as the doctor directory grows.
create extension if not exists pg_trgm;
create index if not exists profiles_full_name_trgm_idx on public.profiles using gin (full_name gin_trgm_ops);

-- payments only had a *partial* index on appointment_id (where status =
-- 'Pending', migration 0006, for the double-submit guard). Lookups that
-- filter by appointment_id + any other status — e.g. billing.service.ts's
-- "already paid?" check — fall through to a sequential scan as the table
-- grows. A plain index covers those too.
create index if not exists payments_appointment_idx on public.payments (appointment_id);
