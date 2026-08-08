export interface RefundRequest {
  id: number;
  patient_name: string;
  amount: string;
  reason: string;
  status: string; // Pending | Processed
  gateway: string;
  created_at: Date;
  updated_at: Date;
}
