import { describe, expect, it } from 'vitest';

import { AppError, createErrorDto, createStatusDto } from './index.js';

describe('shared DTO helpers', () => {
  it('creates a status DTO with an ISO timestamp', () => {
    const checkedAt = new Date('2026-06-16T00:00:00.000Z');

    expect(createStatusDto('ok', 'ready', checkedAt)).toEqual({
      status: 'ok',
      message: 'ready',
      checkedAt: '2026-06-16T00:00:00.000Z'
    });
  });

  it('omits optional fields when they are not provided', () => {
    expect(createErrorDto('NOT_FOUND', 'Missing')).toEqual({
      code: 'NOT_FOUND',
      message: 'Missing'
    });
  });

  it('converts AppError instances to DTOs', () => {
    const error = new AppError('BAD_REQUEST', 'Invalid input', { field: 'name' });

    expect(error.toDto()).toEqual({
      code: 'BAD_REQUEST',
      message: 'Invalid input',
      details: { field: 'name' }
    });
  });
});
