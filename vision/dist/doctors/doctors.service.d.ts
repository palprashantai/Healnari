import { Repository } from 'typeorm';
import { Doctor } from './doctor.entity';
import { Appointment, AppointmentStatus } from '../appointments/appointment.entity';
import { Prescription } from '../records/prescription.entity';
import { LabResult } from '../records/lab-result.entity';
import { RefillRequest } from './refill-request.entity';
export declare class DoctorsService {
    private readonly doctorRepository;
    private readonly appointmentRepository;
    private readonly prescriptionRepository;
    private readonly labResultRepository;
    private readonly refillRequestRepository;
    constructor(doctorRepository: Repository<Doctor>, appointmentRepository: Repository<Appointment>, prescriptionRepository: Repository<Prescription>, labResultRepository: Repository<LabResult>, refillRequestRepository: Repository<RefillRequest>);
    getProfile(userId: number): Promise<Doctor>;
    getDashboardStats(userId: number): Promise<{
        todayQueue: number;
        totalPatients: number;
        weekRevenue: number;
        avgRating: number;
        totalConsults: number;
        completedConsults: number;
        pendingLabReviews: number;
        pendingRefills: number;
    }>;
    getTodayQueue(userId: number): Promise<{
        id: number;
        token: string;
        name: string;
        patientId: number;
        type: string;
        time: Date;
        status: AppointmentStatus;
    }[]>;
    updateQueueStatus(userId: number, appointmentId: number, status: string): Promise<Appointment>;
    getPendingLabs(userId: number): Promise<LabResult[]>;
    getRefillRequests(userId: number): Promise<RefillRequest[]>;
    handleRefill(userId: number, refillId: number, action: string): Promise<RefillRequest>;
    getPatients(userId: number): Promise<any[]>;
    getAppointments(userId: number): Promise<Appointment[]>;
    getPrescriptions(userId: number): Promise<Prescription[]>;
    writePrescription(userId: number, data: any): Promise<Prescription>;
    updateProfile(userId: number, data: any): Promise<Doctor>;
    submitKyc(userId: number, data: any): Promise<{
        doctorId: number;
        qualifications: any;
        licenseNumber: any;
        submittedAt: string;
        status: string;
    }>;
    searchDoctors(query?: string, specialty?: string): Promise<Doctor[]>;
    getAvailableSlots(doctorId: number, date: string): Promise<{
        doctorId: number;
        date: string;
        availableSlots: string[];
        fee: number;
    }>;
    getStaff(userId: number): Promise<never[]>;
    getReports(userId: number): Promise<{
        totalConsultations: number;
        completed: number;
        cancelled: number;
        noShow: number;
    }>;
    getBillingData(userId: number): Promise<{
        totalEarnings: number;
        pendingPayout: number;
        platformCommission: string;
    }>;
}
