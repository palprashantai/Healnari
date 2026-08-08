/** Mirrors `public.appointment_waitlist` — a patient waiting for a slot with a fully booked doctor. */
export interface AppointmentWaitlistEntry {
  id: string;
  patient_id: string;
  doctor_id: string;
  preferred_window: string;
  status: 'Waiting' | 'Notified' | 'Cancelled';
  created_at: Date;
}
