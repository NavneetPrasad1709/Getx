import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

/**
 * Catch-all exception filter — emits a structured JSON line for every
 * 5xx (the only class worth alarming on) so Railway / Vercel / any log
 * shipper can ingest it without bespoke parsers, and returns a sanitised
 * JSON body to the client.
 *
 * The more specific `ZodExceptionFilter` is still registered first in
 * `main.ts`, so 400 validation errors keep their field-level shape.
 * 4xx HttpExceptions short-circuit to the standard `{ statusCode,
 * error, message }` shape and are NOT logged at error level (those are
 * expected user mistakes, not server faults).
 *
 * Sensitive fields are never logged — only the path, method, status,
 * error name, message, and stack. Request bodies (which can carry
 * passwords, refresh tokens, PII) are deliberately excluded.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const responseBody = isHttp
      ? exception.getResponse()
      : {
          statusCode: status,
          error: 'InternalServerError',
          message: 'Internal server error',
        };

    if (status >= 500) {
      /* Structured JSON — single line so log shippers index correctly. */
      this.logger.error(
        JSON.stringify({
          level: 'error',
          message:
            exception instanceof Error ? exception.message : String(exception),
          name: exception instanceof Error ? exception.name : 'UnknownError',
          path: req.url,
          method: req.method,
          statusCode: status,
          stack: exception instanceof Error ? exception.stack : undefined,
          timestamp: new Date().toISOString(),
        }),
      );
    }

    if (typeof responseBody === 'string') {
      res.status(status).json({
        statusCode: status,
        error: isHttp ? exception.name : 'InternalServerError',
        message: responseBody,
      });
    } else {
      res.status(status).json(responseBody);
    }
  }
}
