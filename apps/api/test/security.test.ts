import { describe, it, expect } from 'vitest';
import {
  toProviderDto,
  toChannelDto,
  toIncidentDto,
  toCheckDto,
  toSettingDto,
} from '../src/dto/mappers.js';

describe('Provider DTO security', () => {
  it('never exposes encrypted credentials', () => {
    const row = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Test Provider',
      type: 'xtream' as const,
      baseUrl: 'https://example.com/api',
      usernameEncrypted: 'encrypted-username-data',
      passwordEncrypted: 'encrypted-password-data',
      encryptionNonce: 'nonce-value',
      encryptionTag: 'tag-value',
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const dto = toProviderDto(row);
    const json = JSON.stringify(dto);

    expect(json).not.toContain('encrypted-username-data');
    expect(json).not.toContain('encrypted-password-data');
    expect(json).not.toContain('nonce-value');
    expect(json).not.toContain('tag-value');
    expect(json).not.toContain('usernameEncrypted');
    expect(json).not.toContain('passwordEncrypted');
    expect(json).not.toContain('encryptionNonce');
    expect(json).not.toContain('encryptionTag');
    expect(json).not.toContain('baseUrl');
    expect(json).not.toContain('example.com');
    expect(dto.hasCredentials).toBe(true);
  });

  it('reports hasCredentials=false when no credentials', () => {
    const row = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'M3U Provider',
      type: 'm3u' as const,
      baseUrl: 'https://example.com/playlist.m3u',
      usernameEncrypted: null,
      passwordEncrypted: null,
      encryptionNonce: null,
      encryptionTag: null,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const dto = toProviderDto(row);
    expect(dto.hasCredentials).toBe(false);
  });
});

describe('Channel DTO security', () => {
  it('never exposes stream URLs or external stream IDs', () => {
    const row = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      providerId: '550e8400-e29b-41d4-a716-446655440001',
      categoryId: null,
      externalStreamId: 'stream_12345',
      name: 'Test Channel',
      normalizedName: 'test_channel',
      logoPath: '/logos/test.png',
      enabled: true,
      monitorEnabled: true,
      priority: 'manual' as const,
      checkIntervalMinutes: 30,
      checkDurationSeconds: 15,
      nextCheckAt: new Date(),
      lastCheckAt: new Date(),
      currentStatus: 'online' as const,
      consecutiveFailures: 0,
      consecutiveSuccesses: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const dto = toChannelDto(row);
    const json = JSON.stringify(dto);

    expect(json).not.toContain('stream_12345');
    expect(json).not.toContain('externalStreamId');
    expect(json).not.toContain('streamUrl');
    expect(json).not.toContain('logoPath');
  });
});

describe('Check DTO security', () => {
  it('never exposes stream URLs in check results', () => {
    const row = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      channelId: '550e8400-e29b-41d4-a716-446655440001',
      checkedAt: new Date(),
      status: 'success' as const,
      connectionMs: 100,
      firstByteMs: 200,
      firstVideoFrameMs: 500,
      firstAudioFrameMs: 400,
      totalStartupMs: 600,
      checkDurationMs: 15000,
      receivedBytes: 5000000,
      averageBitrateKbps: 3000,
      videoCodec: 'h264',
      audioCodec: 'aac',
      width: 1920,
      height: 1080,
      fps: '30.000',
      audioDetected: true,
      videoDetected: true,
      decoderErrors: 0,
      freezeDurationMs: null,
      blackDurationMs: null,
      httpStatus: 200,
      errorCode: null,
      sanitizedErrorMessage: null,
    };

    const dto = toCheckDto(row);
    const json = JSON.stringify(dto);

    expect(json).not.toContain('streamUrl');
    expect(json).not.toContain('http://');
    expect(json).not.toContain('https://');
  });
});

describe('Incident DTO security', () => {
  it('does not expose sensitive data', () => {
    const row = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      channelId: '550e8400-e29b-41d4-a716-446655440001',
      startedAt: new Date(),
      resolvedAt: null,
      status: 'open' as const,
      errorCode: 'CONNECT_TIMEOUT' as const,
      failedChecks: 3,
      successfulRecoveryChecks: 0,
    };

    const dto = toIncidentDto(row, 'Channel Name');
    const json = JSON.stringify(dto);

    expect(json).not.toContain('streamUrl');
    expect(json).not.toContain('http://');
    expect(json).not.toContain('https://');
    expect(dto.channelName).toBe('Channel Name');
  });
});

describe('Error response security', () => {
  it('error format never contains stack traces in production', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const { buildTestApp } = await import('./helpers.js');
    const app = await buildTestApp();

    try {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/providers/not-a-uuid',
      });

      const body = res.json();
      const json = JSON.stringify(body);
      expect(json).not.toContain('at ');
      expect(json).not.toContain('.ts:');
      expect(json).not.toContain('.js:');
    } finally {
      await app.close();
      process.env.NODE_ENV = originalEnv;
    }
  }, 30_000);

  it('does not echo sensitive URLs in not found responses', async () => {
    const { buildTestApp } = await import('./helpers.js');
    const app = await buildTestApp();

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/missing?password=secret',
    });

    expect(res.statusCode).toBe(404);
    expect(JSON.stringify(res.json())).not.toContain('secret');

    await app.close();
  });
});

describe('Settings DTO security', () => {
  it('redacts sensitive setting values', () => {
    const dto = toSettingDto({
      key: 'telegram.botToken',
      value: '123456:secret',
      updatedAt: new Date(),
    });

    expect(dto.value).toBe('[REDACTED]');
  });
});

describe('CSRF protections', () => {
  it('rejects unsafe requests from disallowed origins', async () => {
    const { buildTestApp } = await import('./helpers.js');
    const app = await buildTestApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/providers',
      headers: {
        origin: 'https://evil.com',
        'content-type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe('CSRF_ORIGIN_DENIED');

    await app.close();
  });

  it('rejects browser form posts without a CSRF header', async () => {
    const { buildTestApp } = await import('./helpers.js');
    const app = await buildTestApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/providers',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'name=test',
    });

    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe('CSRF_TOKEN_REQUIRED');

    await app.close();
  });
});

describe('CORS', () => {
  it('does not allow arbitrary origins by default', async () => {
    const { buildTestApp } = await import('./helpers.js');
    const app = await buildTestApp();

    const res = await app.inject({
      method: 'OPTIONS',
      url: '/api/v1/health',
      headers: {
        origin: 'https://evil.com',
        'access-control-request-method': 'GET',
      },
    });

    expect(res.headers['access-control-allow-origin']).not.toBe('*');
    expect(res.headers['access-control-allow-origin']).not.toBe('https://evil.com');

    await app.close();
  });
});
