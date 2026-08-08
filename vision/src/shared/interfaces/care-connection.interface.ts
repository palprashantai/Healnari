export interface CareConnectionPermissions {
  cycleWindow: boolean;
  appointments: boolean;
  detailedRx: boolean;
}

/** Mirrors `public.care_connections` — a patient's partner/caregiver share, keyed by email. */
export interface CareConnection {
  id: string;
  patient_id: string;
  invitee_email: string;
  invitee_name: string;
  relation: string;
  status: 'Pending Acceptance' | 'Connected';
  permissions: CareConnectionPermissions;
  invite_token: string;
  created_at: Date;
  updated_at: Date;
}
