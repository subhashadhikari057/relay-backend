import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';

type ErrorPayload = {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  traceId: string;
  error: {
    code: string;
    message: string | string[];
    details?: unknown;
  };
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const traceId = this.getTraceId(request);

    const normalizedError = this.normalizeException(exception);
    const payload: ErrorPayload = {
      statusCode: normalizedError.statusCode,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      traceId,
      error: {
        code: normalizedError.code,
        message: normalizedError.message,
        details: normalizedError.details,
      },
    };

    this.logException(exception, payload);

    response.status(normalizedError.statusCode).json(payload);
  }

  private getTraceId(request: Request) {
    const requestIdHeader = request.headers['x-request-id'];
    if (typeof requestIdHeader === 'string' && requestIdHeader.trim()) {
      return requestIdHeader;
    }

    return randomUUID();
  }

  private normalizeException(exception: unknown) {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const httpResponse = exception.getResponse();
      const message = this.extractHttpExceptionMessage(httpResponse);

      return {
        statusCode,
        code: this.httpStatusToErrorCode(statusCode),
        message,
        details: this.extractHttpExceptionDetails(statusCode, httpResponse),
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        return {
          statusCode: HttpStatus.CONFLICT,
          code: 'UNIQUE_CONSTRAINT_VIOLATION',
          message: 'A record with the same unique field already exists.',
          details: exception.meta,
        };
      }

      if (exception.code === 'P2003') {
        return {
          statusCode: HttpStatus.CONFLICT,
          code: 'FOREIGN_KEY_CONSTRAINT_VIOLATION',
          message: 'Operation violates a foreign key constraint.',
          details: exception.meta,
        };
      }

      if (exception.code === 'P2025') {
        return {
          statusCode: HttpStatus.NOT_FOUND,
          code: 'RECORD_NOT_FOUND',
          message: 'The requested record does not exist.',
          details: exception.meta,
        };
      }

      return {
        statusCode: HttpStatus.BAD_REQUEST,
        code: `PRISMA_${exception.code}`,
        message: exception.message,
        details: exception.meta,
      };
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        code: 'PRISMA_VALIDATION_ERROR',
        message: 'Invalid Prisma query input.',
        details: exception.message,
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred.',
      details: this.isProduction()
        ? undefined
        : this.getUnknownErrorDetails(exception),
    };
  }

  private extractHttpExceptionMessage(response: unknown) {
    if (typeof response === 'string') {
      return response;
    }

    if (typeof response === 'object' && response !== null) {
      const message = (response as { message?: unknown }).message;
      if (typeof message === 'string' || Array.isArray(message)) {
        return message;
      }
    }

    return 'Request failed';
  }

  private extractHttpExceptionDetails(statusCode: number, response: unknown) {
    if (statusCode !== 400 && statusCode !== 422) {
      return undefined;
    }

    if (typeof response === 'string') {
      return { issues: [response] };
    }

    if (typeof response === 'object' && response !== null) {
      const message = (response as { message?: unknown }).message;
      if (Array.isArray(message)) {
        return { issues: message };
      }

      if (typeof message === 'string') {
        return { issues: [message] };
      }

      return response;
    }

    return undefined;
  }

  private httpStatusToErrorCode(statusCode: number) {
    if (statusCode === 400) return 'BAD_REQUEST';
    if (statusCode === 401) return 'UNAUTHORIZED';
    if (statusCode === 403) return 'FORBIDDEN';
    if (statusCode === 404) return 'NOT_FOUND';
    if (statusCode === 409) return 'CONFLICT';
    if (statusCode === 422) return 'UNPROCESSABLE_ENTITY';

    if (statusCode >= 500) {
      return 'INTERNAL_SERVER_ERROR';
    }

    return 'HTTP_EXCEPTION';
  }

  private logException(exception: unknown, payload: ErrorPayload) {
    const message = `${payload.method} ${payload.path} -> ${payload.statusCode} (${payload.error.code}) traceId=${payload.traceId}`;
    if (payload.statusCode >= 500) {
      this.logger.error(
        message,
        exception instanceof Error ? exception.stack : undefined,
      );
      return;
    }

    this.logger.warn(message);
  }

  private getUnknownErrorDetails(exception: unknown) {
    if (exception instanceof Error) {
      return {
        name: exception.name,
        message: exception.message,
      };
    }

    return { value: String(exception) };
  }

  private isProduction() {
    return process.env.NODE_ENV === 'production';
  }
}
