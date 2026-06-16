import { ERROR_CODES, type ErrorCode } from '@vhvtv/database';

export const STANDARD_MONITORING_ERROR_CODES = ERROR_CODES;

export function toStandardErrorCode(value: unknown): ErrorCode {
  if (typeof value === 'string' && STANDARD_MONITORING_ERROR_CODES.includes(value as ErrorCode)) {
    return value as ErrorCode;
  }

  return 'UNKNOWN_ERROR';
}
