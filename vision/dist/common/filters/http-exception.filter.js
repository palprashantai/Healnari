"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AllExceptionsFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllExceptionsFilter = void 0;
const common_1 = require("@nestjs/common");
const response_helper_1 = require("../helpers/response.helper");
const errors_constant_1 = require("../constants/errors.constant");
let AllExceptionsFilter = AllExceptionsFilter_1 = class AllExceptionsFilter {
    logger = new common_1.Logger(AllExceptionsFilter_1.name);
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        let status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let message = errors_constant_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR;
        let errorDetails = null;
        if (exception instanceof common_1.HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();
            if (typeof exceptionResponse === 'object' && exceptionResponse !== null && 'message' in exceptionResponse) {
                const res = exceptionResponse;
                message = Array.isArray(res.message) ? res.message.join(', ') : res.message;
                errorDetails = res.error || exception.name;
            }
            else {
                message = typeof exceptionResponse === 'string' ? exceptionResponse : exception.message;
                errorDetails = exception.name;
            }
        }
        else if (exception instanceof Error) {
            this.logger.error(`Unhandled Exception: ${exception.message}`, exception.stack);
            message = errors_constant_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR;
            errorDetails = process.env.NODE_ENV !== 'production' ? exception.stack : 'Internal server error';
        }
        else {
            this.logger.error('Unknown Exception', exception);
        }
        this.logger.error(`${request.method} ${request.url} - Status: ${status} - Message: ${message}`);
        response.status(status).json(response_helper_1.ResponseHelper.error(message, errorDetails));
    }
};
exports.AllExceptionsFilter = AllExceptionsFilter;
exports.AllExceptionsFilter = AllExceptionsFilter = AllExceptionsFilter_1 = __decorate([
    (0, common_1.Catch)()
], AllExceptionsFilter);
//# sourceMappingURL=http-exception.filter.js.map