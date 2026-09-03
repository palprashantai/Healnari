-- 0069_multi_currency_money_model.sql
-- Production-grade multi-currency money model, transaction-level FX lock, and discrepancy audit

-- 1. Extend appointments table with fee, frozen base fee, patient payable amount, and locked FX quote
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS fee numeric(12, 2);
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS base_fee_amount numeric(12, 2);
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS base_fee_currency text DEFAULT 'INR';

ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS patient_payable_amount numeric(12, 2);
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS patient_payable_currency text DEFAULT 'INR';

ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS exchange_rate numeric(14, 6) DEFAULT 1.0;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS exchange_rate_source text DEFAULT 'healnari_treasury_matrix_v1';
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS exchange_rate_timestamp timestamptz DEFAULT now();

-- 2. Extend payments table with complete 4-part money model columns
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS base_amount numeric(12, 2);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS base_currency text DEFAULT 'INR';

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS paid_amount numeric(12, 2);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS paid_currency text DEFAULT 'INR';

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS doctor_payout_amount numeric(12, 2);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS doctor_payout_currency text DEFAULT 'INR';

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS platform_commission_amount numeric(12, 2);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS platform_commission_currency text DEFAULT 'INR';

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS discrepancy_flag boolean DEFAULT false;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS discrepancy_reason text;

-- 3. Backfill existing appointments safely
UPDATE public.appointments a
SET
  fee = COALESCE(a.fee, a.base_fee_amount, p.consultation_fee, 799),
  base_fee_amount = COALESCE(a.base_fee_amount, a.fee, p.consultation_fee, 799),
  base_fee_currency = COALESCE(a.base_fee_currency, p.currency, a.currency, 'INR'),
  patient_payable_amount = COALESCE(a.patient_payable_amount, a.fee, p.consultation_fee, 799),
  patient_payable_currency = COALESCE(a.patient_payable_currency, a.currency, 'INR')
FROM public.profiles p
WHERE a.doctor_id = p.id AND (a.base_fee_amount IS NULL OR a.fee IS NULL);

UPDATE public.appointments
SET
  fee = COALESCE(fee, base_fee_amount, 799),
  base_fee_amount = COALESCE(base_fee_amount, fee, 799),
  base_fee_currency = COALESCE(base_fee_currency, currency, 'INR'),
  patient_payable_amount = COALESCE(patient_payable_amount, fee, 799),
  patient_payable_currency = COALESCE(patient_payable_currency, currency, 'INR')
WHERE base_fee_amount IS NULL OR fee IS NULL;

-- 4. Backfill existing payments safely
UPDATE public.payments
SET
  base_amount = COALESCE(base_amount, original_amount, amount),
  base_currency = COALESCE(base_currency, original_currency, currency, 'INR'),
  paid_amount = COALESCE(paid_amount, original_amount, amount),
  paid_currency = COALESCE(paid_currency, original_currency, currency, 'INR'),
  doctor_payout_amount = COALESCE(doctor_payout_amount, provider_payout_amount, ROUND(amount * 0.90, 2)),
  doctor_payout_currency = COALESCE(doctor_payout_currency, provider_payout_currency, currency, 'INR'),
  platform_commission_amount = COALESCE(platform_commission_amount, platform_fee_amount, ROUND(amount * 0.10, 2)),
  platform_commission_currency = COALESCE(platform_commission_currency, platform_fee_currency, currency, 'INR')
WHERE base_amount IS NULL;

-- 5. Indexes for multi-currency lookup performance
CREATE INDEX IF NOT EXISTS idx_appointments_payable_curr ON public.appointments (patient_payable_currency);
CREATE INDEX IF NOT EXISTS idx_payments_paid_curr ON public.payments (paid_currency);
CREATE INDEX IF NOT EXISTS idx_payments_payout_curr ON public.payments (doctor_payout_currency);
CREATE INDEX IF NOT EXISTS idx_payments_discrepancy ON public.payments (discrepancy_flag) WHERE discrepancy_flag = true;
