import { Repository } from 'typeorm';
import { Appointment } from './appointment.entity';
export declare class AppointmentsService {
    private readonly appointmentRepository;
    constructor(appointmentRepository: Repository<Appointment>);
    book(data: {
        patientId: number;
        doctorId: number;
        appointmentDate: string;
        type: string;
        notes?: string;
    }): Promise<Appointment>;
    cancel(appointmentId: number): Promise<Appointment>;
    reschedule(appointmentId: number, newDate: string): Promise<Appointment>;
    updateStatus(appointmentId: number, status: string): Promise<Appointment>;
    getById(appointmentId: number): Promise<Appointment>;
}
