import type { FastifyInstance } from 'fastify';
import { eq, and, ilike, count, inArray } from 'drizzle-orm';
import type { Database } from '@vhvtv/database';
import { channels } from '@vhvtv/database';
import { toChannelDto } from '../dto/mappers.js';
import { paginate, offsetFromPage } from '../dto/pagination.js';
import { channelIdParamSchema } from '../schemas/common.js';
import { channelFilterSchema, updateChannelSchema, bulkMonitorSchema } from '../schemas/channel.js';
import { ApiError } from '../plugins/error-handler.js';
import type { SQL } from 'drizzle-orm';

export async function channelRoutes(app: FastifyInstance, opts: { db: Database }): Promise<void> {
  const { db } = opts;

  app.get('/channels', {
    schema: { tags: ['channels'], summary: 'List channels with filters' },
  }, async (request, reply) => {
    const query = channelFilterSchema.parse(request.query);
    const offset = offsetFromPage(query.page, query.limit);

    const conditions: SQL[] = [];
    if (query.providerId) conditions.push(eq(channels.providerId, query.providerId));
    if (query.categoryId) conditions.push(eq(channels.categoryId, query.categoryId));
    if (query.status) conditions.push(eq(channels.currentStatus, query.status));
    if (query.monitorEnabled !== undefined) conditions.push(eq(channels.monitorEnabled, query.monitorEnabled));
    if (query.search) conditions.push(ilike(channels.name, `%${query.search}%`));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, totalResult] = await Promise.all([
      db.select().from(channels).where(where).limit(query.limit).offset(offset).orderBy(channels.name),
      db.select({ count: count() }).from(channels).where(where),
    ]);

    return reply.send(paginate(rows.map(toChannelDto), Number(totalResult[0]?.count ?? 0), query.page, query.limit));
  });

  app.get('/channels/:channelId', {
    schema: { tags: ['channels'], summary: 'Get a single channel' },
  }, async (request, reply) => {
    const { channelId } = channelIdParamSchema.parse(request.params);
    const [channel] = await db.select().from(channels).where(eq(channels.id, channelId)).limit(1);
    if (!channel) throw new ApiError(404, 'NOT_FOUND', 'Channel not found.');
    return reply.send(toChannelDto(channel));
  });

  app.patch('/channels/:channelId', {
    schema: { tags: ['channels'], summary: 'Update channel settings' },
  }, async (request, reply) => {
    const { channelId } = channelIdParamSchema.parse(request.params);
    const body = updateChannelSchema.parse(request.body);

    const [existing] = await db.select({ id: channels.id }).from(channels).where(eq(channels.id, channelId)).limit(1);
    if (!existing) throw new ApiError(404, 'NOT_FOUND', 'Channel not found.');

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.enabled !== undefined) updates.enabled = body.enabled;
    if (body.monitorEnabled !== undefined) updates.monitorEnabled = body.monitorEnabled;
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.checkIntervalMinutes !== undefined) updates.checkIntervalMinutes = body.checkIntervalMinutes;
    if (body.checkDurationSeconds !== undefined) updates.checkDurationSeconds = body.checkDurationSeconds;

    const [updated] = await db.update(channels).set(updates).where(eq(channels.id, channelId)).returning();
    return reply.send(toChannelDto(updated!));
  });

  app.post('/channels/:channelId/check-now', {
    schema: { tags: ['channels'], summary: 'Schedule an immediate check' },
  }, async (request, reply) => {
    const { channelId } = channelIdParamSchema.parse(request.params);

    const [channel] = await db.select({ id: channels.id }).from(channels).where(eq(channels.id, channelId)).limit(1);
    if (!channel) throw new ApiError(404, 'NOT_FOUND', 'Channel not found.');

    await db
      .update(channels)
      .set({ nextCheckAt: new Date(), updatedAt: new Date() })
      .where(eq(channels.id, channelId));

    return reply.send({ message: 'Check scheduled.', channelId });
  });

  app.post('/channels/bulk-monitor', {
    schema: { tags: ['channels'], summary: 'Enable or disable monitoring for multiple channels' },
  }, async (request, reply) => {
    const body = bulkMonitorSchema.parse(request.body);

    const result = await db
      .update(channels)
      .set({ monitorEnabled: body.monitorEnabled, updatedAt: new Date() })
      .where(inArray(channels.id, body.channelIds))
      .returning({ id: channels.id });

    return reply.send({
      updated: result.length,
      monitorEnabled: body.monitorEnabled,
    });
  });
}
