import { Patient } from '../patients/patient.entity';
export declare class HealthGoal {
    id: number;
    patient_id: number;
    label: string;
    progress_pct: number;
    color: string;
    created_at: Date;
    patient: Patient;
}
