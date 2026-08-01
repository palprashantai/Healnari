import { Patient } from '../patients/patient.entity';
import { Doctor } from '../doctors/doctor.entity';
export declare enum AppointmentStatus {
    SCHEDULED = "scheduled",
    COMPLETED = "completed",
    CANCELLED = "cancelled",
    NO_SHOW = "no_show"
}
export declare class Appointment {
    id: number;
    patient_id: number;
    doctor_id: number;
    appointment_date: Date;
    status: AppointmentStatus;
    notes: string;
    patient: Patient;
    doctor: Doctor;
}
