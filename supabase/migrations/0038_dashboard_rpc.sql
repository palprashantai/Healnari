-- 1. Doctor Patients List (Optimizes patients.service.ts N+1)
CREATE OR REPLACE FUNCTION get_doctor_patients(p_doctor_id uuid)
RETURNS TABLE (
  profile jsonb,
  record jsonb,
  prescriptions jsonb,
  lab_reports jsonb,
  clinical_notes jsonb,
  payments jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH doc_patients AS (
    SELECT patient_id FROM appointments WHERE doctor_id = p_doctor_id AND deleted_at IS NULL
    UNION
    SELECT patient_id FROM patient_records WHERE created_by_doctor_id = p_doctor_id AND deleted_at IS NULL
  )
  SELECT 
    to_jsonb(p.*) as profile,
    to_jsonb(r.*) as record,
    COALESCE((SELECT jsonb_agg(to_jsonb(pr.*)) FROM prescriptions pr WHERE pr.patient_id = dp.patient_id AND pr.deleted_at IS NULL), '[]'::jsonb) as prescriptions,
    COALESCE((SELECT jsonb_agg(to_jsonb(lr.*)) FROM lab_reports lr WHERE lr.patient_id = dp.patient_id AND lr.deleted_at IS NULL), '[]'::jsonb) as lab_reports,
    COALESCE((SELECT jsonb_agg(to_jsonb(cn.*)) FROM clinical_notes cn WHERE cn.patient_id = dp.patient_id AND cn.deleted_at IS NULL), '[]'::jsonb) as clinical_notes,
    COALESCE((SELECT jsonb_agg(to_jsonb(py.*)) FROM payments py WHERE py.patient_id = dp.patient_id), '[]'::jsonb) as payments
  FROM doc_patients dp
  JOIN profiles p ON p.id = dp.patient_id
  LEFT JOIN patient_records r ON r.patient_id = dp.patient_id AND r.deleted_at IS NULL
  WHERE p.role = 'patient';
END;
$$;

-- 2. Admin Dashboard Revenue (Optimizes admin.service.ts dashboard stats)
CREATE OR REPLACE FUNCTION get_dashboard_revenue()
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_revenue numeric;
BEGIN
  SELECT COALESCE(SUM(p.consultation_fee), 0) INTO v_revenue
  FROM appointments a
  JOIN profiles p ON a.doctor_id = p.id
  WHERE a.status = 'Done' AND a.deleted_at IS NULL;
  
  RETURN v_revenue;
END;
$$;
