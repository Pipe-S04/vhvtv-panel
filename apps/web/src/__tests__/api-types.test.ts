import { describe, it, expect } from 'vitest';
import type {
  ProviderDto,
  ChannelDto,
  CheckDto,
  DashboardDto,
  PaginatedResponse,
  MonitoringStatusDto,
} from '../lib/api-types';

describe('API types - no credentials or stream URLs', () => {
  it('ProviderDto does not contain password or url fields', () => {
    const provider: ProviderDto = {
      id: 'test',
      name: 'Test',
      type: 'xtream',
      enabled: true,
      hasCredentials: true,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };
    const keys = Object.keys(provider);
    expect(keys).not.toContain('password');
    expect(keys).not.toContain('passwordEncrypted');
    expect(keys).not.toContain('usernameEncrypted');
    expect(keys).not.toContain('baseUrl');
    expect(keys).not.toContain('encryptionNonce');
    expect(keys).not.toContain('encryptionTag');
  });

  it('ChannelDto does not contain stream URL', () => {
    const channel: ChannelDto = {
      id: 'test',
      providerId: 'p1',
      categoryId: null,
      name: 'Test Channel',
      normalizedName: 'test_channel',
      logoPath: null,
      enabled: true,
      monitorEnabled: true,
      priority: 'manual',
      checkIntervalMinutes: 30,
      checkDurationSeconds: 15,
      nextCheckAt: null,
      lastCheckAt: null,
      currentStatus: 'online',
      consecutiveFailures: 0,
      consecutiveSuccesses: 5,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };
    const keys = Object.keys(channel);
    expect(keys).not.toContain('streamUrl');
    expect(keys).not.toContain('url');
    expect(keys).not.toContain('externalStreamId');
  });

  it('CheckDto does not contain stream URL', () => {
    const check: CheckDto = {
      id: 'test',
      channelId: 'c1',
      checkedAt: '2024-01-01',
      status: 'success',
      connectionMs: 100,
      firstByteMs: 200,
      totalStartupMs: 500,
      checkDurationMs: 15000,
      averageBitrateKbps: 3000,
      videoCodec: 'h264',
      audioCodec: 'aac',
      width: 1920,
      height: 1080,
      audioDetected: true,
      videoDetected: true,
      decoderErrors: 0,
      httpStatus: 200,
      errorCode: null,
      sanitizedErrorMessage: null,
    };
    const keys = Object.keys(check);
    expect(keys).not.toContain('streamUrl');
    expect(keys).not.toContain('url');
  });

  it('PaginatedResponse has correct structure', () => {
    const response: PaginatedResponse<ProviderDto> = {
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    };
    expect(response.data).toEqual([]);
    expect(response.pagination.page).toBe(1);
  });

  it('DashboardDto has expected fields', () => {
    const dashboard: DashboardDto = {
      monitoredChannels: 100,
      online: 90,
      degraded: 5,
      offline: 3,
      unknown: 2,
      averageStartupMs: 1500,
      availability24h: 99.5,
      activeIncidents: 2,
    };
    expect(dashboard.monitoredChannels).toBe(100);
    expect(dashboard.availability24h).toBe(99.5);
  });

  it('MonitoringStatusDto has paused field', () => {
    const status: MonitoringStatusDto = { paused: false };
    expect(status.paused).toBe(false);
  });
});
