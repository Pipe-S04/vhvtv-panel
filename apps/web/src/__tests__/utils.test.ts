import { describe, it, expect } from 'vitest';
import {
  cn,
  formatDate,
  formatDateShort,
  formatDuration,
  formatNumber,
  formatPercent,
  getStatusColors,
  getStatusLabel,
} from '../lib/utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('handles conditional classes', () => {
    const condition = false;
    expect(cn('base', condition && 'hidden', 'extra')).toBe('base extra');
  });

  it('merges tailwind conflicts', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2');
  });
});

describe('formatDate', () => {
  it('returns em-dash for null', () => {
    expect(formatDate(null)).toBe('—');
  });

  it('returns em-dash for undefined', () => {
    expect(formatDate(undefined)).toBe('—');
  });

  it('formats a valid ISO date', () => {
    const result = formatDate('2024-01-15T10:30:00Z');
    expect(result).toBeTruthy();
    expect(result).not.toBe('—');
  });
});

describe('formatDateShort', () => {
  it('returns em-dash for null', () => {
    expect(formatDateShort(null)).toBe('—');
  });
});

describe('formatDuration', () => {
  it('returns em-dash for null', () => {
    expect(formatDuration(null)).toBe('—');
  });

  it('formats milliseconds', () => {
    expect(formatDuration(500)).toBe('500 ms');
  });

  it('formats seconds', () => {
    expect(formatDuration(2500)).toBe('2.5 s');
  });
});

describe('formatNumber', () => {
  it('returns em-dash for null', () => {
    expect(formatNumber(null)).toBe('—');
  });

  it('formats numbers', () => {
    const result = formatNumber(1234);
    expect(result).toBeTruthy();
  });
});

describe('formatPercent', () => {
  it('returns em-dash for null', () => {
    expect(formatPercent(null)).toBe('—');
  });

  it('formats percentage', () => {
    expect(formatPercent(99.5)).toBe('99.5 %');
  });
});

describe('getStatusColors', () => {
  it('returns colors for online', () => {
    const colors = getStatusColors('online');
    expect(colors.text).toContain('online');
    expect(colors.bg).toContain('online');
    expect(colors.dot).toContain('online');
  });

  it('returns unknown colors for invalid status', () => {
    const colors = getStatusColors('invalid');
    expect(colors.text).toContain('unknown');
  });
});

describe('getStatusLabel', () => {
  it('returns German label for online', () => {
    expect(getStatusLabel('online')).toBe('Online');
  });

  it('returns German label for offline', () => {
    expect(getStatusLabel('offline')).toBe('Offline');
  });

  it('returns German label for degraded', () => {
    expect(getStatusLabel('degraded')).toMatch(/eingeschränkt/i);
  });

  it('returns raw value for unknown status', () => {
    expect(getStatusLabel('foobar')).toBe('foobar');
  });
});
