import { randomUUID } from 'node:crypto';
import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';

export const requestIdPlugin = fp(async (app: FastifyInstance): Promise<void> => {
  app.addHook('onRequest', async (request, reply) => {
    const existing = request.headers['x-request-id'];
    const requestId =
      typeof existing === 'string' && existing.length > 0 && existing.length <= 128
        ? existing
        : randomUUID();
    request.id = requestId;
    void reply.header('x-request-id', requestId);
  });
}, { name: 'request-id' });
