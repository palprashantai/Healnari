export enum PrescriptionStatus {
  ACTIVE = 'Active',
  EXPIRED = 'Expired',
}

/** Mirrors `public.prescriptions`. Refills are the `refill_requested` flag on
 * this row, not a separate record — see `request_refill()` in the migration. */
export interface Prescription {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  med_name: string;
  dosage: string | null;
  schedule: string | null;
  duration: string | null;
  refills_left: number;
  status: PrescriptionStatus;
  instructions: string | null;
  valid_till: string | null;
  refill_requested: boolean;
  prescribed_at: string;
  created_at: Date;
  updated_at: Date;
}
