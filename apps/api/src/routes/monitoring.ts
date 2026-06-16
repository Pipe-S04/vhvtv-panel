import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import type { Database } from '@vhvtv/database';
import { settings } from '@vhvtv/database';

export async function monitoringRoutes(app: FastifyInstance, opts: { db: Database }): Promise<void> {
  const { db } = opts;

  app.post('/monitoring/pause', {
    schema: { tags: ['monitoring'], summary: 'Pause all monitoring' },
  }, async (_request, reply) => {
    await db
      .insert(settings)
      .values({ key: 'monitoring.paused', value: true, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: true, updatedAt: new Date() },
      });

    return reply.send({ message: 'Monitoring paused.', paused: true });
  });

  app.post('/monitoring/resume', {
    schema: { tags: ['monitoring'], summary: 'Resume all monitoring' },
  }, async (_request, reply) => {
    await db
      .insert(settings)
      .values({ key: 'monitoring.paused', value: false, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: false, updatedAt: new Date() },
      });

    return reply.send({ message: 'Monitoring resumed.', paused: false });
  });

  app.get('/monitoring/status', {
    schema: { tags: ['monitoring'], summary: 'Get monitoring status' },
  }, async (_request, reply) => {
    const [row] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, 'monitoring.paused'))
      .limit(1);

    const paused = row?.value === true;

    return reply.send({ paused });
  });
}
