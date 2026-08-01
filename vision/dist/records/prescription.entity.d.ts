import { Patient } from '../patients/patient.entity';
import { Doctor } from '../doctors/doctor.entity';
import { Appointment } from '../appointments/appointment.entity';
export declare class Prescription {
    id: number;
    patient_id: number;
    doctor_id: number;
    appointment_id: number;
    medications: string;
    instructions: string;
    patient: Patient;
    doctor: Doctor;
    appointment: Appointment;
}
