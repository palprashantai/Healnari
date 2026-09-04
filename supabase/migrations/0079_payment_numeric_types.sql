-- Migration 0079: Strict Financial Precision
-- Upgrades standard numeric(10,2) to numeric(12,4) to support strict multi-currency conversion precision.

ALTER TABLE public.payments ALTER COLUMN amount TYPE numeric(12, 4);
