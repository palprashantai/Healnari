export enum LabReportStatus {
  PENDING = 'Pending',
  COMPLETED = 'Completed',
}

/** Mirrors `public.lab_reports`. */
export interface LabReport {
  id: string;
  patient_id: string;
  ordered_by: string | null;
  test_category: string | null;
  test_name: string;
  lab_name: string | null;
  status: LabReportStatus;
  urgent: boolean;
  results: Record<string, unknown>;
  interpretation: string | null;
  doctor_action: string | null;
  created_at: Date;
}
