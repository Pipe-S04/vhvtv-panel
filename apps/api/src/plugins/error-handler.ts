import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyError } from 'fastify';
import { AppError, redactString, sanitizeError } from '@vhvtv/shared';
import { ZodError } from 'zod';

export type ApiErrorResponse = {
  error: {
    code: string;
    message: string;
    requestId: string;
  };
};

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const errorHandlerPlugin = fp(async (app: FastifyInstance): Promise<void> => {
  app.setNotFoundHandler((request, reply) => {
    const requestId = String(request.id ?? '');
    return reply.status(404).send({
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found.',
        requestId,
      },
    } satisfies ApiErrorResponse);
  });

  app.setErrorHandler((error: FastifyError | Error, request, reply) => {
    const requestId = String(request.id ?? '');

    if (error instanceof ApiError) {
      return reply.status(error.statusCode).send({
        error: { code: error.code, message: redactString(error.message), requestId },
      } satisfies ApiErrorResponse);
    }

    if (error instanceof AppError) {
      return reply.status(400).send({
        error: { code: error.code, message: redactString(error.message), requestId },
      } satisfies ApiErrorResponse);
    }

    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Request validation failed.', requestId },
      } satisfies ApiErrorResponse);
    }

    if ('statusCode' in error && typeof error.statusCode === 'number') {
      const code = error.statusCode === 429 ? 'RATE_LIMIT_EXCEEDED' : errorCodeFromStatus(error.statusCode);
      const message =
        error.statusCode === 429
          ? redactString(error.message)
          : safeMessage(error, error.statusCode < 500);
      return reply.status(error.statusCode).send({
        error: { code, message, requestId },
      } satisfies ApiErrorResponse);
    }

    const safe = sanitizeError(error);
    request.log.error({ err: safe, requestId }, 'Unhandled error');
    return reply.status(500).send({
      error: {
        code: safe.code,
        message: isProduction() ? 'An internal error occurred.' : safe.message,
        requestId,
      },
    } satisfies ApiErrorResponse);
  });
}, { name: 'error-handler' });

function errorCodeFromStatus(status: number): string {
  switch (status) {
    case 400: return 'BAD_REQUEST';
    case 404: return 'NOT_FOUND';
    case 409: return 'CONFLICT';
    case 413: return 'PAYLOAD_TOO_LARGE';
    case 414: return 'URI_TOO_LONG';
    case 415: return 'UNSUPPORTED_MEDIA_TYPE';
    case 422: return 'VALIDATION_ERROR';
    default: return status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR';
  }
}

function safeMessage(error: Error, expose: boolean): string {
  if (expose) return redactString(error.message);
  return isProduction() ? 'An internal error occurred.' : sanitizeError(error).message;
}

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}
