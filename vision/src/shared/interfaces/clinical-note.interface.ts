/** Mirrors `public.clinical_notes` — doctor-only EMR chart notes. */
export interface ClinicalNote {
  id: string;
  patient_id: string;
  doctor_id: string;
  note: string;
  created_at: Date;
}
