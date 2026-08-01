import { PatientsService } from './patients.service';
export declare class OnboardDto {
    age: string;
    height: string;
    weight: string;
    bloodGroup: string;
    conditions: string[];
    phone?: string;
    city?: string;
    date_of_birth?: string;
}
export declare class HealthMetricsDto {
    bloodPressure?: string;
    weight?: string;
    exerciseLevel?: string;
    sleepHours?: number;
}
export declare class SymptomReportDto {
    symptoms: string[];
    severity: number;
}
export declare class LogGoalDto {
    goalId: number;
}
export declare class PatientsController {
    private readonly patientsService;
    constructor(patientsService: PatientsService);
    private extractUserId;
    getDashboard(headers: any): Promise<{
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
    onboard(headers: any, body: OnboardDto): Promise<{
        success: boolean;
        message: string;
        data: any;
        timestamp: string;
    }>;
    updateHealthMetrics(headers: any, body: HealthMetricsDto): Promise<{
        success: boolean;
        message: string;
        data: any;
        timestamp: string;
    }>;
    getUpcomingVisits(headers: any): Promise<{
        success: boolean;
        message: string;
        data: any;
        timestamp: string;
    }>;
    getCycleData(headers: any): Promise<{
        success: boolean;
        message: string;
        data: any;
        timestamp: string;
    }>;
    submitSymptomReport(headers: any, body: SymptomReportDto): Promise<{
        success: boolean;
        message: string;
        data: any;
        timestamp: string;
    }>;
    getHealthGoals(headers: any): Promise<{
        success: boolean;
        message: string;
        data: any;
        timestamp: string;
    }>;
    logGoalProgress(headers: any, body: LogGoalDto): Promise<{
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
    getLabReports(headers: any): Promise<{
        success: boolean;
        message: string;
        data: any;
        timestamp: string;
    }>;
    getBilling(headers: any): Promise<{
        success: boolean;
        message: string;
        data: any;
        timestamp: string;
    }>;
    getFamilyMembers(headers: any): Promise<{
        success: boolean;
        message: string;
        data: any;
        timestamp: string;
    }>;
}
