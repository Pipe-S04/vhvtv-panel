import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from './helpers.js';

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildTestApp();
});

afterAll(async () => {
  await app.close();
});

describe('Health endpoints', () => {
  it('GET /api/v1/health returns 200', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
  });

  it('GET /api/v1/readiness returns 503 when db fails', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/readiness' });
    expect(res.statusCode).toBe(503);
    const body = res.json();
    expect(body.status).toBe('error');
    expect(body.checks.database).toBe('error');
  });
});

describe('Error format', () => {
  it('returns standard error format for 404', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/nonexistent' });
    expect(res.statusCode).toBe(404);
    const body = res.json();
    expect(body.error).toBeDefined();
    expect(body.error.code).toBeDefined();
    expect(body.error.message).toBeDefined();
    expect(body.error.requestId).toBeDefined();
  });

  it('returns standard error format for validation errors', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/providers/not-a-uuid',
    });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    const body = res.json();
    expect(body.error).toBeDefined();
    expect(body.error.code).toBeDefined();
    expect(body.error.message).toBeDefined();
    expect(body.error.requestId).toBeDefined();
  });
});

describe('Request ID', () => {
  it('returns x-request-id header', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(res.headers['x-request-id']).toBeDefined();
    expect(typeof res.headers['x-request-id']).toBe('string');
    expect((res.headers['x-request-id'] as string).length).toBeGreaterThan(0);
  });

  it('echoes back provided x-request-id', async () => {
    const customId = 'test-request-123';
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/health',
      headers: { 'x-request-id': customId },
    });
    expect(res.headers['x-request-id']).toBe(customId);
  });
});

describe('Security headers', () => {
  it('returns Content-Security-Policy', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(res.headers['content-security-policy']).toBeDefined();
  });

  it('returns X-Content-Type-Options', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('returns Strict-Transport-Security', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(res.headers['strict-transport-security']).toBeDefined();
  });

  it('returns X-Frame-Options', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(res.headers['x-frame-options']).toBeDefined();
  });
});

describe('Request size limit', () => {
  it('rejects payloads over 1 MB', async () => {
    const largeBody = JSON.stringify({ data: 'x'.repeat(1_100_000) });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/providers',
      headers: { 'content-type': 'application/json' },
      body: largeBody,
    });
    expect(res.statusCode).toBe(413);
  });
});

describe('OpenAPI documentation', () => {
  it('serves /docs endpoint', async () => {
    const res = await app.inject({ method: 'GET', url: '/docs/json' });
    expect(res.statusCode).toBe(200);
    const doc = res.json();
    expect(doc.openapi).toBeDefined();
    expect(doc.info.title).toBe('VHV TV Panel API');
  });
});

describe('API versioning', () => {
  it('all endpoints are under /api/v1', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(res.statusCode).toBe(200);
  });

  it('root path returns 404', async () => {
    const res = await app.inject({ method: 'GET', url: '/' });
    expect(res.statusCode).toBe(404);
  });
});
