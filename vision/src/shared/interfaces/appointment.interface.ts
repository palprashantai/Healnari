export enum AppointmentType {
  VIDEO = 'video',
  CLINIC = 'clinic',
}

export enum AppointmentStatus {
  REQUESTED = 'Requested',
  APPROVED = 'Approved',
  HOLD = 'HOLD',
  UPCOMING = 'Upcoming',
  WAITING = 'Waiting',
  IN_PROGRESS = 'In Progress',
  DONE = 'Done',
  NO_SHOW = 'No Show',
  CANCELLED = 'Cancelled',
}

/** Mirrors `public.appointments`. */
export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  specialty: string | null;
  type: AppointmentType;
  scheduled_date: string;
  scheduled_time: string;
  reason: string | null;
  status: AppointmentStatus;
  country?: string;
  currency?: string;
  created_at: Date;
  updated_at: Date;
}
