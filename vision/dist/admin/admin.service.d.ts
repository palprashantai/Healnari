import { Repository } from 'typeorm';
import { User } from '../auth/user.entity';
import { Doctor } from '../doctors/doctor.entity';
import { Patient } from '../patients/patient.entity';
import { Appointment } from '../appointments/appointment.entity';
import { SupportTicket } from './support-ticket.entity';
import { RefundRequest } from './refund-request.entity';
export declare class AdminService {
    private readonly userRepository;
    private readonly doctorRepository;
    private readonly patientRepository;
    private readonly appointmentRepository;
    private readonly ticketRepository;
    private readonly refundRepository;
    constructor(userRepository: Repository<User>, doctorRepository: Repository<Doctor>, patientRepository: Repository<Patient>, appointmentRepository: Repository<Appointment>, ticketRepository: Repository<SupportTicket>, refundRepository: Repository<RefundRequest>);
    getDashboardStats(): Promise<{
        totalUsers: number;
        activeDoctors: number;
        totalPatients: number;
        platformRevenue: number;
        pendingVerifications: number;
        totalAppointments: number;
        completedConsultations: number;
        openTickets: number;
        pendingRefunds: number;
    }>;
    getSystemHealth(): Promise<{
        name: string;
        status: string;
        ping: string;
    }[]>;
    getAllUsers(): Promise<User[]>;
    getDoctorsAndClinics(): Promise<Doctor[]>;
    getPendingVerifications(): Promise<Doctor[]>;
    updateDoctorVerification(id: number, status: string): Promise<{
        doctorId: number;
        statusUpdated: string;
        processedAt: string;
    }>;
    getRevenueData(): Promise<{
        currentMonth: number;
        completedConsultations: number;
        revenueBySpecialty: any[];
    }>;
    getSupportTickets(): Promise<SupportTicket[]>;
    resolveTicket(ticketId: number): Promise<SupportTicket>;
    getRefundRequests(): Promise<RefundRequest[]>;
    processRefund(refundId: number): Promise<RefundRequest>;
    getCmsContent(): Promise<{
        banners: never[];
        faqs: never[];
        terms: string;
        privacy: string;
    }>;
    getPlatformReports(): Promise<{
        totalRegisteredUsers: number;
        totalAppointments: number;
        completedAppointments: number;
        cancelledAppointments: number;
        completionRate: string;
    }>;
}
