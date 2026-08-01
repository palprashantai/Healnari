import { DoctorsService } from './doctors.service';
export declare class UpdateProfileDto {
    specialization?: string;
    consultation_fee?: number;
}
export declare class KycSubmissionDto {
    qualifications: string;
    licenseNumber: string;
}
export declare class WritePrescriptionDto {
    patientId: number;
    appointmentId?: number;
    medications: string;
    instructions?: string;
}
export declare class UpdateQueueStatusDto {
    status: string;
}
export declare class HandleRefillDto {
    action: string;
}
export declare class DoctorsController {
    private readonly doctorsService;
    constructor(doctorsService: DoctorsService);
    private extractUserId;
    getDashboard(headers: any): Promise<{
        success: boolean;
        message: string;
        data: any;
        timestamp: string;
    }>;
    getTodayQueue(headers: any): Promise<{
        success: boolean;
        message: string;
        data: any;
        timestamp: string;
    }>;
    updateQueueStatus(headers: any, appointmentId: string, body: UpdateQueueStatusDto): Promise<{
        success: boolean;
        message: string;
        data: any;
        timestamp: string;
    }>;
    getPendingLabs(headers: any): Promise<{
        success: boolean;
        message: string;
        data: any;
        timestamp: string;
    }>;
    getRefillRequests(headers: any): Promise<{
        success: boolean;
        message: string;
        data: any;
        timestamp: string;
    }>;
    handleRefill(headers: any, refillId: string, body: HandleRefillDto): Promise<{
        success: boolean;
        message: string;
        data: any;
        timestamp: string;
    }>;
    getProfile(headers: any): Promise<{
        success: boolean;
        message: string;
        data: any;
        timestamp: string;
    }>;
    updateProfile(headers: any, body: UpdateProfileDto): Promise<{
        success: boolean;
        message: string;
        data: any;
        timestamp: string;
    }>;
    submitKyc(headers: any, body: KycSubmissionDto): Promise<{
        success: boolean;
        message: string;
        data: any;
        timestamp: string;
    }>;
    getPatients(headers: any): Promise<{
        success: boolean;
        message: string;
        data: any;
        timestamp: string;
    }>;
    getAppointments(headers: any): Promise<{
        success: boolean;
        message: string;
        data: any;
        timestamp: string;
    }>;
    getPrescriptions(headers: any): Promise<{
        success: boolean;
        message: string;
        data: any;
        timestamp: string;
    }>;
    writePrescription(headers: any, body: WritePrescriptionDto): Promise<{
        success: boolean;
        message: string;
        data: any;
        timestamp: string;
    }>;
    getReports(headers: any): Promise<{
        success: boolean;
        message: string;
        data: any;
        timestamp: string;
    }>;
    getBillingData(headers: any): Promise<{
        success: boolean;
        message: string;
        data: any;
        timestamp: string;
    }>;
    getStaff(headers: any): Promise<{
        success: boolean;
        message: string;
        data: any;
        timestamp: string;
    }>;
    searchDoctors(q?: string, specialty?: string): Promise<{
        success: boolean;
        message: string;
        data: any;
        timestamp: string;
    }>;
    getAvailableSlots(doctorId: string, date: string): Promise<{
        success: boolean;
        message: string;
        data: any;
        timestamp: string;
    }>;
}
