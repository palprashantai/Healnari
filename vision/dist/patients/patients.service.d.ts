import { Repository } from 'typeorm';
import { Patient } from './patient.entity';
import { Appointment } from '../appointments/appointment.entity';
import { Prescription } from '../records/prescription.entity';
import { LabResult } from '../records/lab-result.entity';
import { HealthGoal } from './health-goal.entity';
import { CycleLog } from './cycle-log.entity';
import { SymptomLog } from './symptom-log.entity';
export declare class PatientsService {
    private readonly patientRepository;
    private readonly appointmentRepository;
    private readonly prescriptionRepository;
    private readonly labResultRepository;
    private readonly healthGoalRepository;
    private readonly cycleLogRepository;
    private readonly symptomLogRepository;
    constructor(patientRepository: Repository<Patient>, appointmentRepository: Repository<Appointment>, prescriptionRepository: Repository<Prescription>, labResultRepository: Repository<LabResult>, healthGoalRepository: Repository<HealthGoal>, cycleLogRepository: Repository<CycleLog>, symptomLogRepository: Repository<SymptomLog>);
    getProfile(userId: number): Promise<Patient>;
    getDashboardStats(userId: number): Promise<{
        nextAppointmentInDays: number | null;
        upcomingAppointments: number;
        activePrescriptions: number;
        healthScore: number;
        unreadReports: number;
    }>;
    getUpcomingVisits(userId: number): Promise<Appointment[]>;
    onboard(userId: number, data: any): Promise<Patient>;
    updateHealthMetrics(userId: number, metrics: any): Promise<any>;
    getAppointments(userId: number): Promise<Appointment[]>;
    getPrescriptions(userId: number): Promise<Prescription[]>;
    getBilling(userId: number): Promise<{
        invoiceId: string;
        date: Date;
        doctorName: string;
        amount: number;
        status: string;
        paymentMethod: string;
    }[]>;
    submitSymptomReport(userId: number, data: {
        symptoms: string[];
        severity: number;
    }): Promise<SymptomLog>;
    getLabReports(userId: number): Promise<{
        patientId: number;
        panels: any[];
    }>;
    getHealthGoals(userId: number): Promise<HealthGoal[]>;
    logGoalProgress(userId: number, goalId: number): Promise<HealthGoal>;
    getCycleData(userId: number): Promise<{
        currentPhase: null;
        cycleDay: null;
        cycleLength: null;
        message: string;
        cycleStartDate?: undefined;
    } | {
        currentPhase: string;
        cycleDay: number;
        cycleLength: number;
        cycleStartDate: Date;
        message?: undefined;
    }>;
    getFamilyMembers(userId: number): Promise<never[]>;
}
