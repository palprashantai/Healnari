import { AppointmentsService } from './appointments.service';
export declare class BookAppointmentDto {
    patientId: number;
    doctorId: number;
    appointmentDate: string;
    type: string;
    notes?: string;
}
export declare class RescheduleDto {
    newDate: string;
}
export declare class UpdateStatusDto {
    status: string;
}
export declare class AppointmentsController {
    private readonly appointmentsService;
    constructor(appointmentsService: AppointmentsService);
    book(body: BookAppointmentDto): Promise<{
        success: boolean;
        message: string;
        data: any;
        timestamp: string;
    }>;
    getById(id: string): Promise<{
        success: boolean;
        message: string;
        data: any;
        timestamp: string;
    }>;
    cancel(id: string): Promise<{
        success: boolean;
        message: string;
        data: any;
        timestamp: string;
    }>;
    reschedule(id: string, body: RescheduleDto): Promise<{
        success: boolean;
        message: string;
        data: any;
        timestamp: string;
    }>;
    updateStatus(id: string, body: UpdateStatusDto): Promise<{
        success: boolean;
        message: string;
        data: any;
        timestamp: string;
    }>;
}
