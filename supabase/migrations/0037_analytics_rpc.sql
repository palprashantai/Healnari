-- Create Postgres RPCs for optimized backend analytics

-- 1. Doctor Analytics
CREATE OR REPLACE FUNCTION get_doctor_analytics(p_doctor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_revenue numeric;
  v_total_consultations int;
  v_total_patients int;
  v_no_show_rate numeric;
  v_monthly_trend jsonb;
  v_consult_type_split jsonb;
  v_weekly_load jsonb;
  v_age_demographics jsonb;
  v_top_diagnoses jsonb;
  v_appointment_status_split jsonb;
  v_payment_method_split jsonb;
BEGIN
  -- Total Revenue
  SELECT COALESCE(SUM(amount), 0) INTO v_total_revenue
  FROM payments
  WHERE doctor_id = p_doctor_id AND status = 'Paid';

  -- Total Consultations
  SELECT COUNT(*) INTO v_total_consultations
  FROM appointments
  WHERE doctor_id = p_doctor_id AND deleted_at IS NULL;

  -- Total Patients
  SELECT COUNT(DISTINCT patient_id) INTO v_total_patients
  FROM appointments
  WHERE doctor_id = p_doctor_id AND deleted_at IS NULL;

  -- No Show Rate
  SELECT CASE WHEN v_total_consultations > 0 THEN 
    ROUND((COUNT(*)::numeric / v_total_consultations) * 100, 1) 
  ELSE 0 END INTO v_no_show_rate
  FROM appointments
  WHERE doctor_id = p_doctor_id AND status = 'No Show' AND deleted_at IS NULL;

  -- Monthly Trend
  WITH months AS (
    SELECT generate_series(date_trunc('month', now() - interval '11 months'), date_trunc('month', now()), '1 month')::date AS m
  ),
  rev AS (
    SELECT date_trunc('month', created_at)::date AS m, SUM(amount) AS rev
    FROM payments WHERE doctor_id = p_doctor_id AND status = 'Paid' GROUP BY 1
  ),
  con AS (
    SELECT date_trunc('month', scheduled_date)::date AS m, COUNT(*) AS cons
    FROM appointments WHERE doctor_id = p_doctor_id AND deleted_at IS NULL GROUP BY 1
  )
  SELECT jsonb_agg(jsonb_build_object(
    'month', to_char(m.m, 'Mon'),
    'revenue', COALESCE(r.rev, 0),
    'consultations', COALESCE(c.cons, 0)
  )) INTO v_monthly_trend
  FROM months m
  LEFT JOIN rev r ON m.m = r.m
  LEFT JOIN con c ON m.m = c.m;

  -- Consult Type Split
  SELECT jsonb_build_object(
    'video', COUNT(*) FILTER (WHERE type = 'video'),
    'clinic', COUNT(*) FILTER (WHERE type = 'clinic')
  ) INTO v_consult_type_split
  FROM appointments WHERE doctor_id = p_doctor_id AND deleted_at IS NULL;

  -- Weekly Load
  WITH days AS (SELECT unnest(ARRAY['Mon','Tue','Wed','Thu','Fri','Sat','Sun']) AS d, unnest(ARRAY[1,2,3,4,5,6,0]) AS dow)
  SELECT jsonb_agg(jsonb_build_object('day', d.d, 'consultations', COALESCE(a.c, 0))) INTO v_weekly_load
  FROM days d
  LEFT JOIN (
    SELECT extract(dow from scheduled_date) as dow, COUNT(*) as c
    FROM appointments WHERE doctor_id = p_doctor_id AND deleted_at IS NULL GROUP BY 1
  ) a ON d.dow = a.dow;

  -- Age Demographics
  WITH ages AS (
    SELECT 
      CASE
        WHEN age(dob) <= interval '25 years' THEN '18-25'
        WHEN age(dob) <= interval '35 years' THEN '26-35'
        WHEN age(dob) <= interval '45 years' THEN '36-45'
        WHEN age(dob) <= interval '55 years' THEN '46-55'
        ELSE '56+'
      END as age_bucket
    FROM patient_records
    WHERE patient_id IN (SELECT DISTINCT patient_id FROM appointments WHERE doctor_id = p_doctor_id AND deleted_at IS NULL)
      AND dob IS NOT NULL AND deleted_at IS NULL
  ),
  buckets AS (SELECT unnest(ARRAY['18-25','26-35','36-45','46-55','56+']) AS bucket)
  SELECT jsonb_agg(jsonb_build_object('age', b.bucket, 'count', COALESCE(a.c, 0))) INTO v_age_demographics
  FROM buckets b
  LEFT JOIN (SELECT age_bucket, COUNT(*) as c FROM ages GROUP BY 1) a ON b.bucket = a.age_bucket;

  -- Top Diagnoses
  WITH conds AS (
    SELECT unnest(chronic_conditions) AS condition
    FROM patient_records
    WHERE patient_id IN (SELECT DISTINCT patient_id FROM appointments WHERE doctor_id = p_doctor_id AND deleted_at IS NULL)
      AND chronic_conditions IS NOT NULL AND deleted_at IS NULL
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object('condition', condition, 'count', c)), '[]'::jsonb) INTO v_top_diagnoses
  FROM (SELECT condition, COUNT(*) as c FROM conds GROUP BY 1 ORDER BY 2 DESC LIMIT 6) sq;

  -- Appointment Status Split
  SELECT jsonb_build_object(
    'Completed', COUNT(*) FILTER (WHERE status = 'Done'),
    'Scheduled', COUNT(*) FILTER (WHERE status IN ('Upcoming', 'Waiting')),
    'Cancelled', COUNT(*) FILTER (WHERE status = 'Cancelled'),
    'NoShow', COUNT(*) FILTER (WHERE status = 'No Show')
  ) INTO v_appointment_status_split
  FROM appointments WHERE doctor_id = p_doctor_id AND deleted_at IS NULL;

  -- Payment Method Split
  SELECT jsonb_build_object(
    'UPI', COALESCE(SUM(amount) FILTER (WHERE method = 'UPI'), 0),
    'Card', COALESCE(SUM(amount) FILTER (WHERE method = 'Card'), 0),
    'Cash', COALESCE(SUM(amount) FILTER (WHERE method = 'Cash'), 0)
  ) INTO v_payment_method_split
  FROM payments WHERE doctor_id = p_doctor_id AND status = 'Paid';

  RETURN jsonb_build_object(
    'totalRevenue', v_total_revenue,
    'totalConsultations', v_total_consultations,
    'totalPatients', v_total_patients,
    'noShowRate', v_no_show_rate,
    'monthlyTrend', COALESCE(v_monthly_trend, '[]'::jsonb),
    'consultTypeSplit', v_consult_type_split,
    'weeklyLoad', COALESCE(v_weekly_load, '[]'::jsonb),
    'ageDemographics', COALESCE(v_age_demographics, '[]'::jsonb),
    'topDiagnoses', COALESCE(v_top_diagnoses, '[]'::jsonb),
    'appointmentStatusSplit', v_appointment_status_split,
    'paymentMethodSplit', v_payment_method_split
  );
END;
$$;


-- 2. Admin Analytics
CREATE OR REPLACE FUNCTION get_admin_analytics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_financial_data jsonb;
  v_revenue_by_currency jsonb;
  v_geographic_distribution jsonb;
  v_cross_border jsonb;
  v_specialty_revenue jsonb;
  v_total_doctors int;
  v_total_patients int;
  v_status_breakdown jsonb;
  v_consult_type_split jsonb;
BEGIN
  -- Total Docs / Patients
  SELECT COUNT(*) INTO v_total_doctors FROM profiles WHERE role = 'doctor';
  SELECT COUNT(*) INTO v_total_patients FROM profiles WHERE role = 'patient';

  -- Financial Data (monthly)
  WITH months AS (
    SELECT generate_series(date_trunc('month', now() - interval '11 months'), date_trunc('month', now()), '1 month')::date AS m
  ),
  completed_apts AS (
    SELECT a.scheduled_date, p.consultation_fee
    FROM appointments a
    JOIN profiles p ON a.doctor_id = p.id
    WHERE a.status = 'Done' AND a.deleted_at IS NULL
  ),
  rev AS (
    SELECT date_trunc('month', scheduled_date)::date AS m, SUM(consultation_fee) AS rev
    FROM completed_apts GROUP BY 1
  ),
  cumul_pat AS (
    SELECT m, (SELECT COUNT(*) FROM profiles WHERE role = 'patient' AND created_at < m + interval '1 month') as patients
    FROM months
  ),
  cumul_doc AS (
    SELECT m, (SELECT COUNT(*) FROM profiles WHERE role = 'doctor' AND created_at < m + interval '1 month') as doctors
    FROM months
  )
  SELECT jsonb_agg(jsonb_build_object(
    'name', to_char(m.m, 'Mon'),
    'revenue', COALESCE(r.rev, 0),
    'payout', ROUND(COALESCE(r.rev, 0) * 0.90),
    'margin', COALESCE(r.rev, 0) - ROUND(COALESCE(r.rev, 0) * 0.90),
    'patients', p.patients,
    'doctors', d.doctors
  )) INTO v_financial_data
  FROM months m
  LEFT JOIN rev r ON m.m = r.m
  LEFT JOIN cumul_pat p ON m.m = p.m
  LEFT JOIN cumul_doc d ON m.m = d.m;

  -- Revenue by Currency
  WITH curr_meta(currency, name, symbol, flag) AS (
    VALUES
      ('USD', 'US Dollar', '$', '🇺🇸'),
      ('GBP', 'British Pound', '£', '🇬🇧'),
      ('AED', 'UAE Dirham', 'AED', '🇦🇪'),
      ('EUR', 'Euro', '€', '🇪🇺'),
      ('INR', 'Indian Rupee', '₹', '🇮🇳'),
      ('CAD', 'Canadian Dollar', 'CA$', '🇨🇦'),
      ('AUD', 'Australian Dollar', 'A$', '🇦🇺')
  ),
  agg AS (
    SELECT COALESCE(currency, 'USD') as curr, COUNT(*) as count, SUM(amount) as amount
    FROM payments WHERE status = 'Paid' GROUP BY 1
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'currency', a.curr,
    'name', COALESCE(cm.name, a.curr),
    'symbol', COALESCE(cm.symbol, a.curr),
    'flag', COALESCE(cm.flag, '🌍'),
    'amount', a.amount,
    'count', a.count
  )), '[]'::jsonb) INTO v_revenue_by_currency
  FROM agg a LEFT JOIN curr_meta cm ON a.curr = cm.currency;

  -- Geographic Distribution
  WITH c_meta(code, name, flag) AS (
    VALUES
      ('US', 'United States', '🇺🇸'),
      ('GB', 'United Kingdom', '🇬🇧'),
      ('AE', 'United Arab Emirates', '🇦🇪'),
      ('IN', 'India', '🇮🇳'),
      ('CA', 'Canada', '🇨🇦'),
      ('AU', 'Australia', '🇦🇺'),
      ('EU', 'European Union', '🇪🇺'),
      ('GLOBAL', 'Other International', '🌍')
  ),
  pat AS (
    SELECT COALESCE(country, 'US') as code, COUNT(*) as count
    FROM profiles WHERE role = 'patient' GROUP BY 1
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'code', p.code,
    'name', COALESCE(cm.name, p.code),
    'flag', COALESCE(cm.flag, '🌍'),
    'patientCount', p.count,
    'percentage', CASE WHEN v_total_patients > 0 THEN ROUND((p.count::numeric / v_total_patients) * 100) ELSE 0 END
  )), '[]'::jsonb) INTO v_geographic_distribution
  FROM pat p LEFT JOIN c_meta cm ON p.code = cm.code;

  -- Cross Border
  SELECT jsonb_build_object(
    'international', COUNT(*) FILTER (WHERE COALESCE(country, 'US') != 'IN'),
    'domestic', COUNT(*) FILTER (WHERE COALESCE(country, 'US') = 'IN'),
    'internationalPercentage', CASE WHEN v_total_patients > 0 THEN ROUND((COUNT(*) FILTER (WHERE COALESCE(country, 'US') != 'IN')::numeric / v_total_patients) * 100) ELSE 0 END
  ) INTO v_cross_border
  FROM profiles WHERE role = 'patient';

  -- Specialty Revenue
  WITH colors(id, c) AS (
    VALUES (0, '#6B46C1'), (1, '#10b981'), (2, '#0ea5e9'), (3, '#f59e0b'), (4, '#f43f5e'), (5, '#8b5cf6'), (6, '#06b6d4')
  ),
  spec AS (
    SELECT COALESCE(p.specialty, 'General') as specialty, SUM(p.consultation_fee) as rev
    FROM appointments a
    JOIN profiles p ON a.doctor_id = p.id
    WHERE a.status = 'Done' AND a.deleted_at IS NULL
    GROUP BY 1
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'name', s.specialty,
    'value', s.rev,
    'color', c.c
  )), '[]'::jsonb) INTO v_specialty_revenue
  FROM (SELECT specialty, rev, row_number() over() - 1 as rn FROM spec) s
  JOIN colors c ON MOD(s.rn, 7) = c.id;

  -- Appt Status Breakdown
  SELECT COALESCE(jsonb_agg(jsonb_build_object('status', status, 'count', c)), '[]'::jsonb) INTO v_status_breakdown
  FROM (SELECT status, COUNT(*) as c FROM appointments WHERE deleted_at IS NULL GROUP BY 1) sq;

  -- Consult Type Split
  SELECT jsonb_build_object(
    'video', COUNT(*) FILTER (WHERE type = 'video'),
    'clinic', COUNT(*) FILTER (WHERE type = 'clinic')
  ) INTO v_consult_type_split
  FROM appointments WHERE deleted_at IS NULL;

  -- Return
  RETURN jsonb_build_object(
    'financialData', COALESCE(v_financial_data, '[]'::jsonb),
    'revenueByCurrency', COALESCE(v_revenue_by_currency, '[]'::jsonb),
    'geographicDistribution', COALESCE(v_geographic_distribution, '[]'::jsonb),
    'crossBorderSplit', v_cross_border,
    'specialtyRevenue', COALESCE(v_specialty_revenue, '[]'::jsonb),
    'totalDoctors', v_total_doctors,
    'totalPatients', v_total_patients,
    'appointmentStatusBreakdown', COALESCE(v_status_breakdown, '[]'::jsonb),
    'consultTypeSplit', v_consult_type_split
  );
END;
$$;
