import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, finalize } from 'rxjs';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');
  private static readonly RESET = '\x1b[0m';
  private static readonly GREEN = '\x1b[32m';
  private static readonly YELLOW = '\x1b[33m';
  private static readonly RED = '\x1b[31m';
  private static readonly CYAN = '\x1b[36m';

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();
    const startedAt = process.hrtime.bigint();
    const path = request.originalUrl ?? request.url;

    return next.handle().pipe(
      finalize(() => {
        const durationMs =
          Number(process.hrtime.bigint() - startedAt) / 1_000_000;
        const color = this.getColorByStatus(response.statusCode);

        this.logger.log(
          `${color}${request.method} ${path} ${response.statusCode} - ${durationMs.toFixed(1)}ms${HttpLoggingInterceptor.RESET}`,
        );
      }),
    );
  }

  private getColorByStatus(statusCode: number) {
    if (statusCode >= 500) return HttpLoggingInterceptor.RED;
    if (statusCode >= 400) return HttpLoggingInterceptor.YELLOW;
    if (statusCode >= 200 && statusCode < 300)
      return HttpLoggingInterceptor.GREEN;
    return HttpLoggingInterceptor.CYAN;
  }
}
