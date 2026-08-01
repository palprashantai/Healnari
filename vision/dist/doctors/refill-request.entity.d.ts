import { Doctor } from '../doctors/doctor.entity';
import { Patient } from '../patients/patient.entity';
export declare class RefillRequest {
    id: number;
    patient_id: number;
    doctor_id: number;
    medication: string;
    last_rx_date: Date;
    status: string;
    created_at: Date;
    patient: Patient;
    doctor: Doctor;
}
