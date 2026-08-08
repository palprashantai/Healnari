/** Mirrors `public.lifestyle_logs` — one row per patient per logged day. */
export interface LifestyleLog {
  id: string;
  patient_id: string;
  log_date: string;
  items: Record<string, boolean>;
  completed_count: number;
  created_at: Date;
  updated_at: Date;
}
