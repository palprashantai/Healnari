import { RecordsService } from './records.service';
export declare class CreatePrescriptionDto {
    patientId: number;
    doctorId: number;
    appointmentId?: number;
    medications: string;
    instructions?: string;
}
export declare class RecordsController {
    private readonly recordsService;
    constructor(recordsService: RecordsService);
    getPrescriptions(): Promise<{
        success: boolean;
        message: string;
        data: any;
        timestamp: string;
    }>;
    getPrescriptionById(id: string): Promise<{
        success: boolean;
        message: string;
        data: any;
        timestamp: string;
    }>;
    createPrescription(body: CreatePrescriptionDto): Promise<{
        success: boolean;
        message: string;
        data: any;
        timestamp: string;
    }>;
}
