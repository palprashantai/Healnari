export enum PaymentStatus {
  PAID = 'Paid',
  PENDING = 'Pending',
  INSURANCE_CLAIMED = 'Insurance Claimed',
  REFUNDED = 'Refunded',
}

/** Mirrors `public.payments` — billing line items. */
export interface Payment {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  appointment_id: string | null;
  service: string;
  category: string | null;
  amount: string;
  status: PaymentStatus;
  method: string | null;
  txn_ref: string | null;
  created_at: Date;
}
