import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ResponseHelper } from '@/core/helpers/response.helper';
import {
  ERROR_MESSAGES,
  ERROR_CODES,
  MESSAGE_TO_ERROR_CODE_MAP,
} from '@/core/constants/errors.constant';
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
    let errorCode: string = ERROR_CODES.INTERNAL_SERVER_ERROR;
    let details: any = null;
    const extra: Record<string, any> = {};

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const res = exceptionResponse as any;

        // Message resolution
        if (Array.isArray(res.message)) {
          message = 'Validation failed';
          // Convert array of validation error strings into field-level details if not already present
          if (!res.details) {
            details = res.message.reduce((acc: Record<string, string>, errStr: string) => {
              const field = errStr.split(' ')[0] || 'field';
              acc[field] = errStr;
              return acc;
            }, {});
          } else {
            details = res.details;
          }
          errorCode = ERROR_CODES.VALIDATION_ERROR;
        } else {
          message = res.message || exception.message;
          if (res.details) {
            details = res.details;
          }
        }

        // Error code resolution from response
        if (res.errorCode) {
          errorCode = res.errorCode;
        }

        // Forward special payloads like paywallData for AI credit exhaustion
        if (res.paywallData) {
          extra.paywallData = res.paywallData;
        }
        if (res.creditsRemaining !== undefined) {
          extra.creditsRemaining = res.creditsRemaining;
        }
      } else if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else {
        message = exception.message;
      }

      // If no explicit errorCode was supplied on the exception, infer it
      if (errorCode === ERROR_CODES.INTERNAL_SERVER_ERROR && status !== HttpStatus.INTERNAL_SERVER_ERROR) {
        if (MESSAGE_TO_ERROR_CODE_MAP[message]) {
          errorCode = MESSAGE_TO_ERROR_CODE_MAP[message];
        } else {
          switch (status) {
            case HttpStatus.BAD_REQUEST:
              errorCode = details ? ERROR_CODES.VALIDATION_ERROR : ERROR_CODES.BAD_REQUEST;
              break;
            case HttpStatus.UNAUTHORIZED:
              errorCode = ERROR_CODES.UNAUTHORIZED;
              break;
            case HttpStatus.PAYMENT_REQUIRED:
              errorCode = ERROR_CODES.AI_CREDITS_INSUFFICIENT;
              break;
            case HttpStatus.FORBIDDEN:
              errorCode = ERROR_CODES.FORBIDDEN;
              break;
            case HttpStatus.NOT_FOUND:
              errorCode = ERROR_CODES.RESOURCE_NOT_FOUND;
              break;
            case HttpStatus.CONFLICT:
              errorCode = ERROR_CODES.CONFLICT;
              break;
            case HttpStatus.SERVICE_UNAVAILABLE:
              errorCode = ERROR_CODES.SERVICE_UNAVAILABLE;
              break;
            default:
              errorCode = `HTTP_${status}`;
              break;
          }
        }
      }
    } else if (exception instanceof Error) {
      // Unhandled application errors (e.g. database disconnect, null pointer, syntax error)
      this.logger.error(
        `Unhandled Exception on ${request.method} ${request.url}: ${exception.message}`,
        exception.stack,
      );
      captureException(exception);

      // Safe-by-default: NEVER expose internal SQL, table schemas, or stack traces
      message = ERROR_MESSAGES.INTERNAL_SERVER_ERROR;
      errorCode = ERROR_CODES.INTERNAL_SERVER_ERROR;
    } else {
      this.logger.error('Unknown Non-Error Exception', exception);
      message = ERROR_MESSAGES.INTERNAL_SERVER_ERROR;
      errorCode = ERROR_CODES.INTERNAL_SERVER_ERROR;
    }

    // Structured server-side logging
    const logPrefix = `[${request.method}] ${request.url} -> ${status} (${errorCode}): ${message}`;
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(logPrefix);
    } else if (status >= HttpStatus.BAD_REQUEST) {
      this.logger.warn(logPrefix);
    } else {
      this.logger.log(logPrefix);
    }

    const path = request.originalUrl || request.url;
    response
      .status(status)
      .json(
        ResponseHelper.error(
          message,
          status,
          errorCode,
          path,
          details,
          extra,
        ),
      );
  }
}
