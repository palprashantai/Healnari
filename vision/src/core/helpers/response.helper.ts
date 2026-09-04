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

  static error(
    message: string,
    statusCode: number = 500,
    errorCode: string = 'INTERNAL_SERVER_ERROR',
    path?: string,
    details?: any,
    extra?: Record<string, any>,
  ) {
    const res: Record<string, any> = {
      success: false,
      statusCode,
      message,
      errorCode,
      timestamp: new Date().toISOString(),
    };
    if (path) res.path = path;
    if (details !== undefined && details !== null) res.details = details;
    if (extra && typeof extra === 'object') {
      Object.assign(res, extra);
    }
    return res;
  }

  static paginated(
    data: any[],
    total: number,
    page: number,
    limit: number,
    message: string = 'Success',
  ) {
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
