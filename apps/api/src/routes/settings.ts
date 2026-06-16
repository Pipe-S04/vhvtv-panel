import type { FastifyInstance } from 'fastify';
import type { Database } from '@vhvtv/database';
import { settings } from '@vhvtv/database';
import { toSettingDto } from '../dto/mappers.js';
import { updateSettingsSchema } from '../schemas/settings.js';

export async function settingsRoutes(app: FastifyInstance, opts: { db: Database }): Promise<void> {
  const { db } = opts;

  app.get('/settings', {
    schema: { tags: ['settings'], summary: 'Get all settings' },
  }, async (_request, reply) => {
    const rows = await db.select().from(settings).orderBy(settings.key);
    return reply.send({ data: rows.map(toSettingDto) });
  });

  app.patch('/settings', {
    schema: { tags: ['settings'], summary: 'Update settings' },
  }, async (request, reply) => {
    const body = updateSettingsSchema.parse(request.body);

    const updated: Array<{ key: string; value: unknown }> = [];

    for (const [key, value] of Object.entries(body)) {
      await db
        .insert(settings)
        .values({ key, value, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value, updatedAt: new Date() },
        });
      updated.push({ key, value });
    }

    return reply.send({ updated });
  });
}
