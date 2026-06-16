import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';

export const rateLimitPlugin = fp(async (app: FastifyInstance): Promise<void> => {
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    addHeadersOnExceeding: { 'x-ratelimit-limit': true, 'x-ratelimit-remaining': true, 'x-ratelimit-reset': true },
    addHeaders: { 'x-ratelimit-limit': true, 'x-ratelimit-remaining': true, 'x-ratelimit-reset': true, 'retry-after': true },
    keyGenerator: (request) => request.ip,
  });
}, { name: 'rate-limit' });
