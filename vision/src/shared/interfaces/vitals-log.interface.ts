export type VitalKey = 'weight' | 'bp' | 'sugar' | 'sleep' | 'hirsutism';

/** Mirrors `public.vitals_logs` — one row per reading, history kept. */
export interface VitalsLog {
  id: string;
  patient_id: string;
  vital_key: VitalKey;
  value: string;
  unit: string;
  logged_at: Date;
}
