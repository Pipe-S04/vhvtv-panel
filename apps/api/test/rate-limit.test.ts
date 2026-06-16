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

describe('Rate limiting', () => {
  it('includes rate limit headers', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(res.headers['x-ratelimit-limit']).toBeDefined();
    expect(res.headers['x-ratelimit-remaining']).toBeDefined();
  });

  it('enforces rate limit after max requests', async () => {
    const localApp = await buildTestApp();

    for (let i = 0; i < 101; i++) {
      await localApp.inject({
        method: 'GET',
        url: '/api/v1/health',
        remoteAddress: '10.0.0.1',
      });
    }

    const res = await localApp.inject({
      method: 'GET',
      url: '/api/v1/health',
      remoteAddress: '10.0.0.1',
    });

    expect(res.statusCode).toBe(429);
    const body = res.json();
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(body.error.requestId).toBeDefined();

    await localApp.close();
  });
});
