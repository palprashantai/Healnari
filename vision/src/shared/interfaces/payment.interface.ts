export enum PaymentStatus {
  PAID = 'Paid',
  PENDING = 'Pending',
  INSURANCE_CLAIMED = 'Insurance Claimed',
  REFUNDED = 'Refunded',
  FAILED = 'Failed',
  REFUND_PENDING = 'Refund Pending',
}

/** Mirrors `public.payments` — multi-currency billing line items. */
export interface Payment {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  appointment_id: string | null;
  service: string;
  category: string | null;
  
  // Original Transaction (Immutable)
  amount: number | string;
  currency: string;
  original_amount: number | string;
  original_currency: string;

  // Normalized Reporting Conversion
  reporting_amount?: number | string | null;
  reporting_currency?: string | null;
  fx_rate?: number | string | null;
  fx_rate_source?: string | null;
  fx_rate_timestamp?: Date | string | null;

  // Revenue Segregation
  platform_fee_amount?: number | string | null;
  platform_fee_currency?: string | null;
  provider_payout_amount?: number | string | null;
  provider_payout_currency?: string | null;
  refund_amount?: number | string | null;
  refund_currency?: string | null;
  tax_amount?: number | string | null;
  tax_currency?: string | null;

  status: PaymentStatus;
  method: string | null;
  txn_ref: string | null;
  cf_order_id?: string | null;
  cf_payment_id?: string | null;
  created_at: Date;
}
