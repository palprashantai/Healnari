/** Standardized API response wrapper used by all controllers */
export class ResponseHelper {
  static success(data: any, message: string = 'Success') {
    return {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  static error(message: string, errorDetails?: any) {
    return {
      success: false,
      message,
      error: errorDetails || null,
      timestamp: new Date().toISOString(),
    };
  }

  static paginated(data: any[], total: number, page: number, limit: number, message: string = 'Success') {
    return {
      success: true,
      message,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      timestamp: new Date().toISOString(),
    };
  }
}
