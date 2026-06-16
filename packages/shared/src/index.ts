export const STATUS_VALUES = ['ok', 'warning', 'error'] as const;

export * from './errors.js';
export * from './redaction.js';

export type Status = (typeof STATUS_VALUES)[number];

export interface StatusDto {
  status: Status;
  message?: string;
  checkedAt: string;
}

export interface ErrorDto {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export class AppError extends Error {
  readonly code: string;
  readonly details: Record<string, unknown> | undefined;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
  }

  toDto(): ErrorDto {
    return createErrorDto(this.code, this.message, this.details);
  }
}

export function createStatusDto(
  status: Status,
  message?: string,
  checkedAt = new Date()
): StatusDto {
  return {
    status,
    ...(message === undefined ? {} : { message }),
    checkedAt: checkedAt.toISOString()
  };
}

export function createErrorDto(
  code: string,
  message: string,
  details?: Record<string, unknown>
): ErrorDto {
  return {
    code,
    message,
    ...(details === undefined ? {} : { details })
  };
}
