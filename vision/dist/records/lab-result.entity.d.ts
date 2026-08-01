import { Patient } from '../patients/patient.entity';
export declare class LabResult {
    id: number;
    patient_id: number;
    panel_title: string;
    ordered_by: string;
    lab_name: string;
    test_name: string;
    value: string;
    reference_range: string;
    status: string;
    is_reviewed: boolean;
    created_at: Date;
    patient: Patient;
}
