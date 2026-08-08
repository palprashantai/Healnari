/** Mirrors `public.cycle_logs` — one row per patient per logged day. */
export interface CycleLog {
  id: string;
  patient_id: string;
  log_date: string;
  phase: string | null;
  flow: string | null;
  cramps: number | null;
  mood: string | null;
  symptoms: string[];
  created_at: Date;
}
