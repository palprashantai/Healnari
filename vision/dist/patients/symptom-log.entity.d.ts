import { Patient } from '../patients/patient.entity';
export declare class SymptomLog {
    id: number;
    patient_id: number;
    symptoms: string[];
    severity: number;
    review_status: string;
    created_at: Date;
    patient: Patient;
}
