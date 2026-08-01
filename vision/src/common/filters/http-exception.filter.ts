import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { ResponseHelper } from '../helpers/response.helper';
import { ERROR_MESSAGES } from '../constants/errors.constant';

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
      // Unhandled exceptions (e.g. TypeError, ReferenceError)
      this.logger.error(`Unhandled Exception: ${exception.message}`, exception.stack);
      message = ERROR_MESSAGES.INTERNAL_SERVER_ERROR;
      // Provide stack trace in dev mode, hide in production
      errorDetails = process.env.NODE_ENV !== 'production' ? exception.stack : 'Internal server error';
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
