import { redactString } from './redaction.js';

export type PublicError = {
  code: string;
  message: string;
};

export function sanitizeError(error: unknown, fallbackCode = 'INTERNAL_ERROR'): PublicError {
  if (error instanceof Error) {
    return {
      code: fallbackCode,
      message: redactString(error.message)
    };
  }

  if (typeof error === 'string') {
    return {
      code: fallbackCode,
      message: redactString(error)
    };
  }

  return {
    code: fallbackCode,
    message: 'An unexpected error occurred.'
  };
}
