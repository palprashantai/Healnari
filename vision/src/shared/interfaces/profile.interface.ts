export enum ProfileRole {
  DOCTOR = 'doctor',
  PATIENT = 'patient',
  ADMIN = 'admin',
}

/** Mirrors `public.profiles` — one row per Supabase `auth.users` row. */
export interface Profile {
  id: string;
  role: ProfileRole;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  specialty: string | null;
  registration_no: string | null;
  kyc_verified: boolean;
  kyc_submitted_at: Date | null;
  created_at: Date;
  consultation_fee: number;
  currency?: string | null;
  commission_rate?: number;
  status?: string;
  country?: string;
  timezone?: string;
  medical_council?: string | null;
  updated_at: Date;
  email_notifications: boolean;
  sms_notifications: boolean;
}
