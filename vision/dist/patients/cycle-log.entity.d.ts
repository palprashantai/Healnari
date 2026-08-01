import { Patient } from '../patients/patient.entity';
export declare class CycleLog {
    id: number;
    patient_id: number;
    cycle_start_date: Date;
    cycle_length: number;
    current_phase: string;
    current_day: number;
    created_at: Date;
    patient: Patient;
}
