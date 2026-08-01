"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseHelper = void 0;
class ResponseHelper {
    static success(data, message = 'Success') {
        return {
            success: true,
            message,
            data,
            timestamp: new Date().toISOString(),
        };
    }
    static error(message, errorDetails) {
        return {
            success: false,
            message,
            error: errorDetails || null,
            timestamp: new Date().toISOString(),
        };
    }
    static paginated(data, total, page, limit, message = 'Success') {
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
exports.ResponseHelper = ResponseHelper;
//# sourceMappingURL=response.helper.js.map