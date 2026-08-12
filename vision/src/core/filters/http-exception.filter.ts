import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { ResponseHelper } from '@/core/helpers/response.helper';
import { ERROR_MESSAGES } from '@/core/constants/errors.constant';
import { captureException } from '@/core/monitoring/sentry';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = ERROR_MESSAGES.INTERNAL_SERVER_ERROR;
    let errorDetails: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // Handle class-validator validation errors (usually sent as an object with message arrays)
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null && 'message' in exceptionResponse) {
        const res = exceptionResponse as any;
        message = Array.isArray(res.message) ? res.message.join(', ') : res.message;
        errorDetails = res.error || exception.name;
      } else {
        message = typeof exceptionResponse === 'string' ? exceptionResponse : exception.message;
        errorDetails = exception.name;
      }
    } else if (exception instanceof Error) {
      // Unhandled exceptions (e.g. TypeError, ReferenceError) — the ones
      // that actually need someone paged, not just logged to stdout.
      this.logger.error(`Unhandled Exception: ${exception.message}`, exception.stack);
      captureException(exception);
      message = ERROR_MESSAGES.INTERNAL_SERVER_ERROR;
      // Safe-by-default (AUDIT_REPORT.md OPS-6): only reveal a stack trace
      // when NODE_ENV is explicitly 'development' — an unset NODE_ENV on a
      // misconfigured deploy host now hides internals instead of leaking them.
      errorDetails = process.env.NODE_ENV === 'development' ? exception.stack : 'Internal server error';
    } else {
      this.logger.error('Unknown Exception', exception);
    }

    // Log the error
    this.logger.error(
      `${request.method} ${request.url} - Status: ${status} - Message: ${message}`,
    );

    // Format using our standardized ResponseHelper
    response.status(status).json(ResponseHelper.error(message, errorDetails));
  }
}
