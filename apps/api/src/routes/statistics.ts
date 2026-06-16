import type { FastifyInstance } from 'fastify';
import { eq, and, gte, desc, sql, avg } from 'drizzle-orm';
import type { Database } from '@vhvtv/database';
import { channelChecks, hourlyChannelStats, channels } from '@vhvtv/database';
import { z } from 'zod';

const timeRangeSchema = z.object({
  hours: z.coerce.number().int().min(1).max(720).default(24),
  channelId: z.string().uuid().optional(),
});

export async function statisticsRoutes(app: FastifyInstance, opts: { db: Database }): Promise<void> {
  const { db } = opts;

  app.get('/statistics/availability', {
    schema: { tags: ['statistics'], summary: 'Availability statistics' },
  }, async (request, reply) => {
    const query = timeRangeSchema.parse(request.query);
    const since = new Date(Date.now() - query.hours * 60 * 60 * 1000);

    const conditions = [gte(hourlyChannelStats.hour, since)];
    if (query.channelId) conditions.push(eq(hourlyChannelStats.channelId, query.channelId));

    const rows = await db
      .select({
        channelId: hourlyChannelStats.channelId,
        channelName: channels.name,
        avgAvailability: sql<number>`avg(${hourlyChannelStats.availabilityPercent}::numeric)`,
        totalChecks: sql<number>`sum(${hourlyChannelStats.checks})`,
        successfulChecks: sql<number>`sum(${hourlyChannelStats.successfulChecks})`,
      })
      .from(hourlyChannelStats)
      .innerJoin(channels, eq(hourlyChannelStats.channelId, channels.id))
      .where(and(...conditions))
      .groupBy(hourlyChannelStats.channelId, channels.name)
      .orderBy(sql`avg(${hourlyChannelStats.availabilityPercent}::numeric) asc`)
      .limit(50);

    return reply.send({
      hours: query.hours,
      data: rows.map((r) => ({
        channelId: r.channelId,
        channelName: r.channelName,
        availabilityPercent: Math.round(Number(r.avgAvailability) * 100) / 100,
        totalChecks: Number(r.totalChecks),
        successfulChecks: Number(r.successfulChecks),
      })),
    });
  });

  app.get('/statistics/startup-times', {
    schema: { tags: ['statistics'], summary: 'Startup time statistics' },
  }, async (request, reply) => {
    const query = timeRangeSchema.parse(request.query);
    const since = new Date(Date.now() - query.hours * 60 * 60 * 1000);

    const conditions = [
      gte(channelChecks.checkedAt, since),
      eq(channelChecks.status, 'success'),
    ];
    if (query.channelId) conditions.push(eq(channelChecks.channelId, query.channelId));

    const rows = await db
      .select({
        channelId: channelChecks.channelId,
        channelName: channels.name,
        avgStartupMs: avg(channelChecks.totalStartupMs),
        minStartupMs: sql<number>`min(${channelChecks.totalStartupMs})`,
        maxStartupMs: sql<number>`max(${channelChecks.totalStartupMs})`,
        checkCount: sql<number>`count(*)`,
      })
      .from(channelChecks)
      .innerJoin(channels, eq(channelChecks.channelId, channels.id))
      .where(and(...conditions))
      .groupBy(channelChecks.channelId, channels.name)
      .orderBy(desc(sql`avg(${channelChecks.totalStartupMs})`))
      .limit(50);

    return reply.send({
      hours: query.hours,
      data: rows.map((r) => ({
        channelId: r.channelId,
        channelName: r.channelName,
        avgStartupMs: Math.round(Number(r.avgStartupMs ?? 0)),
        minStartupMs: Number(r.minStartupMs ?? 0),
        maxStartupMs: Number(r.maxStartupMs ?? 0),
        checkCount: Number(r.checkCount),
      })),
    });
  });

  app.get('/statistics/bitrates', {
    schema: { tags: ['statistics'], summary: 'Bitrate statistics' },
  }, async (request, reply) => {
    const query = timeRangeSchema.parse(request.query);
    const since = new Date(Date.now() - query.hours * 60 * 60 * 1000);

    const conditions = [
      gte(channelChecks.checkedAt, since),
      eq(channelChecks.status, 'success'),
    ];
    if (query.channelId) conditions.push(eq(channelChecks.channelId, query.channelId));

    const rows = await db
      .select({
        channelId: channelChecks.channelId,
        channelName: channels.name,
        avgBitrateKbps: avg(channelChecks.averageBitrateKbps),
        minBitrateKbps: sql<number>`min(${channelChecks.averageBitrateKbps})`,
        maxBitrateKbps: sql<number>`max(${channelChecks.averageBitrateKbps})`,
        checkCount: sql<number>`count(*)`,
      })
      .from(channelChecks)
      .innerJoin(channels, eq(channelChecks.channelId, channels.id))
      .where(and(...conditions))
      .groupBy(channelChecks.channelId, channels.name)
      .orderBy(desc(sql`avg(${channelChecks.averageBitrateKbps})`))
      .limit(50);

    return reply.send({
      hours: query.hours,
      data: rows.map((r) => ({
        channelId: r.channelId,
        channelName: r.channelName,
        avgBitrateKbps: Math.round(Number(r.avgBitrateKbps ?? 0)),
        minBitrateKbps: Number(r.minBitrateKbps ?? 0),
        maxBitrateKbps: Number(r.maxBitrateKbps ?? 0),
        checkCount: Number(r.checkCount),
      })),
    });
  });
}
