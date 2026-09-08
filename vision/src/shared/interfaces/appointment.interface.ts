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

export enum CheckInStatus {
  PENDING = 'pending',
  CHECKED_IN = 'checked_in',
  LATE = 'late',
  NO_SHOW = 'no_show',
  EXEMPT = 'exempt',
}

export interface QueueLiveOverview {
  activeConsultation: any | null;
  nextPatient: any | null;
  waitingQueue: any[];
  upcomingAppointments: any[];
  completedAppointments: any[];
  metrics: {
    waitingCount: number;
    inConsultationCount: number;
    nextPatientDisplay: string;
    completedCount: number;
    scheduleDelayMinutes: number;
    requestsCount: number;
    noShowCount: number;
  };
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
  checked_in_at?: string | null;
  queue_token?: string | null;
  queue_priority?: number;
  called_at?: string | null;
  estimated_wait_minutes?: number;
  check_in_status?: CheckInStatus;
  started_at?: string | null;
  ended_at?: string | null;
  consultation_duration_seconds?: number;
  created_at: Date;
  updated_at: Date;
}

