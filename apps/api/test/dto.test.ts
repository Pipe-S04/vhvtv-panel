import { describe, it, expect } from 'vitest';
import { paginate, offsetFromPage } from '../src/dto/pagination.js';

describe('Pagination helpers', () => {
  it('calculates offset correctly', () => {
    expect(offsetFromPage(1, 20)).toBe(0);
    expect(offsetFromPage(2, 20)).toBe(20);
    expect(offsetFromPage(3, 10)).toBe(20);
  });

  it('creates correct paginated response', () => {
    const result = paginate(['a', 'b', 'c'], 30, 1, 10);
    expect(result.data).toEqual(['a', 'b', 'c']);
    expect(result.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 30,
      totalPages: 3,
    });
  });

  it('handles empty results', () => {
    const result = paginate([], 0, 1, 20);
    expect(result.data).toEqual([]);
    expect(result.pagination.total).toBe(0);
    expect(result.pagination.totalPages).toBe(0);
  });

  it('calculates totalPages correctly with remainder', () => {
    const result = paginate(['x'], 21, 1, 10);
    expect(result.pagination.totalPages).toBe(3);
  });
});
