import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const startTime = Date.now();

    const userId = (request as any).user?.userId;
    const hotelId = (request as any).user?.hotelId;

    this.logger.log(
      `→ ${method} ${url} [${ip}] ${userAgent}${userId ? ` user=${userId}` : ''}`,
    );

    return next.handle().pipe(
      tap(() => {
        const statusCode = response.statusCode;
        const durationMs = Date.now() - startTime;

        this.logger.log(
          `← ${method} ${url} ${statusCode} ${durationMs}ms${hotelId ? ` hotel=${hotelId}` : ''}`,
        );
      }),
      catchError((error) => {
        const durationMs = Date.now() - startTime;
        const statusCode = error.status || error.statusCode || 500;

        this.logger.warn(
          `← ${method} ${url} ${statusCode} ${durationMs}ms [ERROR: ${error.message}]`,
        );

        return throwError(() => error);
      }),
    );
  }
}
