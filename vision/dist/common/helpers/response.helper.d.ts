export declare class ResponseHelper {
    static success(data: any, message?: string): {
        success: boolean;
        message: string;
        data: any;
        timestamp: string;
    };
    static error(message: string, errorDetails?: any): {
        success: boolean;
        message: string;
        error: any;
        timestamp: string;
    };
    static paginated(data: any[], total: number, page: number, limit: number, message?: string): {
        success: boolean;
        message: string;
        data: any[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
        timestamp: string;
    };
}
