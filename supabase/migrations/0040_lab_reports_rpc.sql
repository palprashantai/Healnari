-- Optimizes the lab reports queue for doctors by performing the patient_id join in the database.
-- Previously, the backend fetched all patient IDs for a doctor into Node.js memory
-- and then sent them back via a massive `WHERE patient_id IN (...)` clause.

CREATE OR REPLACE FUNCTION get_doctor_lab_reports(p_doctor_id uuid)
RETURNS SETOF lab_reports
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT lr.* 
  FROM lab_reports lr
  WHERE lr.deleted_at IS NULL
  AND lr.patient_id IN (
    SELECT patient_id FROM appointments WHERE doctor_id = p_doctor_id AND deleted_at IS NULL
    UNION
    SELECT patient_id FROM patient_records WHERE created_by_doctor_id = p_doctor_id AND deleted_at IS NULL
  )
  ORDER BY lr.created_at DESC;
END;
$$;
