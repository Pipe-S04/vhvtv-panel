import { describe, it, expect } from 'vitest';
import { createProviderSchema, updateProviderSchema } from '../src/schemas/provider.js';
import { updateChannelSchema, channelFilterSchema, bulkMonitorSchema } from '../src/schemas/channel.js';
import { updateSettingsSchema } from '../src/schemas/settings.js';
import { paginationQuerySchema } from '../src/schemas/common.js';

describe('Provider validation', () => {
  it('validates a valid create provider input', () => {
    const input = {
      name: 'Test Provider',
      type: 'xtream' as const,
      baseUrl: 'https://example.com',
      username: 'user',
      password: 'pass',
      enabled: true,
    };
    const result = createProviderSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('rejects missing name', () => {
    const input = { type: 'xtream', baseUrl: 'https://example.com' };
    const result = createProviderSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects invalid provider type', () => {
    const input = { name: 'Test', type: 'invalid', baseUrl: 'https://example.com' };
    const result = createProviderSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects invalid base URL', () => {
    const input = { name: 'Test', type: 'xtream', baseUrl: 'not-a-url' };
    const result = createProviderSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects overly long name', () => {
    const input = { name: 'x'.repeat(256), type: 'xtream', baseUrl: 'https://example.com' };
    const result = createProviderSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('validates partial update', () => {
    const result = updateProviderSchema.safeParse({ enabled: false });
    expect(result.success).toBe(true);
  });

  it('validates empty update', () => {
    const result = updateProviderSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe('Channel validation', () => {
  it('validates a valid update', () => {
    const result = updateChannelSchema.safeParse({
      monitorEnabled: true,
      priority: 'critical',
      checkIntervalMinutes: 5,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid priority', () => {
    const result = updateChannelSchema.safeParse({ priority: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('rejects too high check interval', () => {
    const result = updateChannelSchema.safeParse({ checkIntervalMinutes: 9999 });
    expect(result.success).toBe(false);
  });

  it('rejects too low check duration', () => {
    const result = updateChannelSchema.safeParse({ checkDurationSeconds: 1 });
    expect(result.success).toBe(false);
  });

  it('validates channel filter with all params', () => {
    const result = channelFilterSchema.safeParse({
      page: '2',
      limit: '10',
      status: 'online',
      monitorEnabled: 'true',
      search: 'test',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(10);
      expect(result.data.monitorEnabled).toBe(true);
    }
  });

  it('validates bulk monitor input', () => {
    const result = bulkMonitorSchema.safeParse({
      channelIds: ['550e8400-e29b-41d4-a716-446655440000'],
      monitorEnabled: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty channel IDs array', () => {
    const result = bulkMonitorSchema.safeParse({ channelIds: [], monitorEnabled: true });
    expect(result.success).toBe(false);
  });

  it('rejects too many channel IDs', () => {
    const ids = Array.from({ length: 501 }, () => '550e8400-e29b-41d4-a716-446655440000');
    const result = bulkMonitorSchema.safeParse({ channelIds: ids, monitorEnabled: true });
    expect(result.success).toBe(false);
  });
});

describe('Pagination validation', () => {
  it('uses defaults when not provided', () => {
    const result = paginationQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it('coerces string numbers', () => {
    const result = paginationQuerySchema.safeParse({ page: '3', limit: '50' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.limit).toBe(50);
    }
  });

  it('rejects page 0', () => {
    const result = paginationQuerySchema.safeParse({ page: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects limit over 100', () => {
    const result = paginationQuerySchema.safeParse({ limit: 101 });
    expect(result.success).toBe(false);
  });
});

describe('Settings validation', () => {
  it('validates valid settings', () => {
    const result = updateSettingsSchema.safeParse({
      'monitoring.paused': true,
      'monitoring.defaultCheckIntervalMinutes': 30,
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-primitive values', () => {
    const result = updateSettingsSchema.safeParse({
      'key': { nested: true },
    });
    expect(result.success).toBe(false);
  });
});
