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
  updated_at: Date;
}
