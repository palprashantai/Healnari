/** Mirrors `public.doctor_favorites` — a patient's starred doctors on the Discovery page. */
export interface DoctorFavorite {
  id: string;
  patient_id: string;
  doctor_id: string;
  created_at: Date;
}
