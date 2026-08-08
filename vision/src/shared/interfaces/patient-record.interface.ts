/** Mirrors `public.patient_records` — the one canonical clinical identity record per patient. */
export interface PatientRecord {
  id: string;
  patient_id: string;
  mrn: string;
  dob: string | null;
  blood_group: string | null;
  allergies: string[];
  chronic_conditions: string[];
  height_cm: string | null;
  weight_kg: string | null;
  primary_doctor_id: string | null;
  created_at: Date;
  updated_at: Date;
}
