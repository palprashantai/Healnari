-- =====================================================================
-- MIGRATION: 0068_analytics_canonical_unification.sql
-- Description: Analytics performance indexes and canonical RPC alignment
--              guaranteeing single source of truth across Admin, Doctor, Patient.
-- =====================================================================

-- 1. Performance Indexes for Real-Time Financial & Funnel Aggregations
CREATE INDEX IF NOT EXISTS idx_payments_analytics 
  ON public.payments (created_at DESC, status, doctor_id, patient_id);

CREATE INDEX IF NOT EXISTS idx_appointments_analytics 
  ON public.appointments (scheduled_date DESC, status, doctor_id, patient_id);

CREATE INDEX IF NOT EXISTS idx_ai_transactions_analytics 
  ON public.ai_transactions (created_at DESC, status, plan_id, country_code);

-- 2. Align get_doctor_analytics to Canonical Formulas
-- Ensures Doctor Analytics revenue matches Doctor Billing and Payout calculations
CREATE OR REPLACE FUNCTION public.get_doctor_analytics(p_doctor_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_revenue NUMERIC := 0;
  v_gross_billings NUMERIC := 0;
  v_platform_commission NUMERIC := 0;
  v_total_consultations INT := 0;
  v_total_patients INT := 0;
  v_no_show_rate NUMERIC := 0;
  v_monthly_trend JSONB := '[]'::JSONB;
  v_weekly_load JSONB := '[]'::JSONB;
  v_consult_type_split JSONB := '{}'::JSONB;
  v_appt_status_split JSONB := '{}'::JSONB;
  v_top_diagnoses JSONB := '[]'::JSONB;
  v_age_demographics JSONB := '[]'::JSONB;
  v_total_booked INT := 0;
  v_no_shows INT := 0;
  v_completed INT := 0;
  v_doctor_currency TEXT := 'INR';
BEGIN
  -- Get doctor's operating currency
  SELECT COALESCE(currency, 'INR') INTO v_doctor_currency
  FROM public.profiles
  WHERE id = p_doctor_id;

  -- Canonical Earnings: Doctor's NET earnings (provider_payout_amount), NOT gross patient payments
  SELECT 
    COALESCE(SUM(COALESCE(provider_payout_amount, amount * 0.90)), 0),
    COALESCE(SUM(COALESCE(original_amount, amount)), 0),
    COALESCE(SUM(COALESCE(platform_fee_amount, amount * 0.10)), 0)
  INTO v_total_revenue, v_gross_billings, v_platform_commission
  FROM public.payments
  WHERE doctor_id = p_doctor_id AND status = 'Paid';

  -- Consultations count
  SELECT COUNT(*) INTO v_completed
  FROM public.appointments
  WHERE doctor_id = p_doctor_id AND status = 'Done' AND deleted_at IS NULL;

  v_total_consultations := v_completed;

  -- Total unique patients
  SELECT COUNT(DISTINCT patient_id) INTO v_total_patients
  FROM public.appointments
  WHERE doctor_id = p_doctor_id AND deleted_at IS NULL;

  -- Safe No-show rate
  SELECT COUNT(*) INTO v_total_booked
  FROM public.appointments
  WHERE doctor_id = p_doctor_id AND deleted_at IS NULL;

  SELECT COUNT(*) INTO v_no_shows
  FROM public.appointments
  WHERE doctor_id = p_doctor_id AND status = 'No-Show' AND deleted_at IS NULL;

  IF v_total_booked > 0 THEN
    v_no_show_rate := ROUND((v_no_shows::NUMERIC / v_total_booked::NUMERIC) * 100, 1);
  ELSE
    v_no_show_rate := 0;
  END IF;

  -- Monthly Trend (6 months)
  SELECT jsonb_agg(row_to_json(m)) INTO v_monthly_trend
  FROM (
    SELECT 
      to_char(series.month, 'Mon') AS month,
      COALESCE(SUM(COALESCE(p.provider_payout_amount, p.amount * 0.90)), 0) AS revenue,
      COUNT(a.id) AS consultations
    FROM generate_series(
      date_trunc('month', now() - INTERVAL '5 months'),
      date_trunc('month', now()),
      INTERVAL '1 month'
    ) series(month)
    LEFT JOIN public.appointments a 
      ON a.doctor_id = p_doctor_id 
      AND a.status = 'Done' 
      AND a.deleted_at IS NULL
      AND date_trunc('month', COALESCE(a.scheduled_at, a.created_at)) = series.month
    LEFT JOIN public.payments p 
      ON p.doctor_id = p_doctor_id 
      AND p.status = 'Paid' 
      AND date_trunc('month', p.created_at) = series.month
    GROUP BY series.month
    ORDER BY series.month ASC
  ) m;

  -- Appointment Status Split
  SELECT jsonb_build_object(
    'Completed', COALESCE(SUM(CASE WHEN status = 'Done' THEN 1 ELSE 0 END), 0),
    'Scheduled', COALESCE(SUM(CASE WHEN status IN ('Upcoming', 'Waiting', 'In-Progress', 'Approved') THEN 1 ELSE 0 END), 0),
    'Cancelled', COALESCE(SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END), 0),
    'NoShow', COALESCE(SUM(CASE WHEN status = 'No-Show' THEN 1 ELSE 0 END), 0)
  ) INTO v_appt_status_split
  FROM public.appointments
  WHERE doctor_id = p_doctor_id AND deleted_at IS NULL;

  -- Consult Type Split
  SELECT jsonb_build_object(
    'video', COALESCE(SUM(CASE WHEN type = 'video' THEN 1 ELSE 0 END), 0),
    'clinic', COALESCE(SUM(CASE WHEN type = 'clinic' THEN 1 ELSE 0 END), 0)
  ) INTO v_consult_type_split
  FROM public.appointments
  WHERE doctor_id = p_doctor_id AND deleted_at IS NULL;

  RETURN jsonb_build_object(
    'totalRevenue', v_total_revenue,
    'grossBillings', v_gross_billings,
    'platformCommission', v_platform_commission,
    'totalConsultations', v_total_consultations,
    'totalPatients', v_total_patients,
    'noShowRate', v_no_show_rate,
    'currency', v_doctor_currency,
    'monthlyTrend', COALESCE(v_monthly_trend, '[]'::JSONB),
    'weeklyLoad', v_weekly_load,
    'consultTypeSplit', v_consult_type_split,
    'appointmentStatusSplit', v_appt_status_split,
    'topDiagnoses', v_top_diagnoses,
    'ageDemographics', v_age_demographics
  );
END;
$$;
