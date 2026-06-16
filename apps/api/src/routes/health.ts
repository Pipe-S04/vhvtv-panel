import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import type { Database } from '@vhvtv/database';

export async function healthRoutes(app: FastifyInstance, opts: { db: Database }): Promise<void> {
  const { db } = opts;

  app.get('/health', {
    schema: {
      tags: ['health'],
      summary: 'Liveness check',
    },
  }, async (_request, reply) => {
    return reply.send({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/readiness', {
    schema: {
      tags: ['health'],
      summary: 'Readiness check — verifies database connectivity',
    },
  }, async (_request, reply) => {
    try {
      await db.execute(sql`SELECT 1`);
      return reply.send({
        status: 'ok',
        timestamp: new Date().toISOString(),
        checks: { database: 'ok' },
      });
    } catch {
      return reply.code(503).send({
        status: 'error',
        timestamp: new Date().toISOString(),
        checks: { database: 'error' },
      } as Record<string, unknown>);
    }
  });
}
