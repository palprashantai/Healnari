import { AdminService } from './admin.service';
export declare class UpdateVerificationDto {
    status: string;
}
export declare class AdminController {
    private readonly adminService;
    constructor(adminService: AdminService);
    private checkAdmin;
    getStats(headers: any): Promise<{
        success: boolean;
        message: string;
        data: any;
        timestamp: string;
    }>;
    getSystemHealth(headers: any): Promise<{
        success: boolean;
        message: string;
        data: any;
        timestamp: string;
    }>;
    getTickets(headers: any): Promise<{
        success: boolean;
        message: string;
        data: any;
        timestamp: string;
    }>;
    resolveTicket(headers: any, id: string): Promise<{
        success: boolean;
        message: string;
        data: any;
        timestamp: string;
    }>;
    getRefunds(headers: any): Promise<{
        success: boolean;
        message: string;
        data: any;
        timestamp: string;
    }>;
    processRefund(headers: any, id: string): Promise<{
        success: boolean;
        message: string;
        data: any;
        timestamp: string;
    }>;
    getUsers(headers: any): Promise<{
        success: boolean;
        message: string;
        data: any;
        timestamp: string;
    }>;
    getClinics(headers: any): Promise<{
        success: boolean;
        message: string;
        data: any;
        timestamp: string;
    }>;
    getPendingVerifications(headers: any): Promise<{
        success: boolean;
        message: string;
        data: any;
        timestamp: string;
    }>;
    updateVerification(headers: any, id: string, body: UpdateVerificationDto): Promise<{
        success: boolean;
        message: string;
        data: any;
        timestamp: string;
    }>;
    getRevenue(headers: any): Promise<{
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
    getCmsContent(headers: any): Promise<{
        success: boolean;
        message: string;
        data: any;
        timestamp: string;
    }>;
}
