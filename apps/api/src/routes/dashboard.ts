import type { FastifyInstance } from 'fastify';
import { eq, sql, and, gte, desc, count } from 'drizzle-orm';
import type { Database } from '@vhvtv/database';
import { channels, incidents, channelChecks } from '@vhvtv/database';
import { toIncidentDto, toCheckDto } from '../dto/mappers.js';

export async function dashboardRoutes(app: FastifyInstance, opts: { db: Database }): Promise<void> {
  const { db } = opts;

  app.get('/dashboard', {
    schema: { tags: ['dashboard'], summary: 'Dashboard overview' },
  }, async (_request, reply) => {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const statusCounts = await db
      .select({
        status: channels.currentStatus,
        count: count(),
      })
      .from(channels)
      .where(and(eq(channels.monitorEnabled, true), eq(channels.enabled, true)))
      .groupBy(channels.currentStatus);

    const monitored = statusCounts.reduce((sum, r) => sum + Number(r.count), 0);
    const byStatus: Record<string, number> = {};
    for (const r of statusCounts) {
      byStatus[r.status] = Number(r.count);
    }

    const avgStartupResult = await db
      .select({ avg: sql<number>`avg(${channelChecks.totalStartupMs})` })
      .from(channelChecks)
      .where(
        and(
          eq(channelChecks.status, 'success'),
          gte(channelChecks.checkedAt, twentyFourHoursAgo)
        )
      );

    const recentChecksResult = await db
      .select({ total: count(), successful: sql<number>`count(*) filter (where ${channelChecks.status} = 'success')` })
      .from(channelChecks)
      .where(gte(channelChecks.checkedAt, twentyFourHoursAgo));

    const total24h = Number(recentChecksResult[0]?.total ?? 0);
    const successful24h = Number(recentChecksResult[0]?.successful ?? 0);
    const availability24h = total24h > 0 ? Math.round((successful24h / total24h) * 10000) / 100 : 100;

    const activeIncidentCount = await db
      .select({ count: count() })
      .from(incidents)
      .where(eq(incidents.status, 'open'));

    return reply.send({
      monitoredChannels: monitored,
      online: byStatus['online'] ?? 0,
      degraded: byStatus['degraded'] ?? 0,
      offline: byStatus['offline'] ?? 0,
      unknown: byStatus['unknown'] ?? 0,
      averageStartupMs: Math.round(Number(avgStartupResult[0]?.avg ?? 0)),
      availability24h,
      activeIncidents: Number(activeIncidentCount[0]?.count ?? 0),
    });
  });

  app.get('/dashboard/incidents', {
    schema: { tags: ['dashboard'], summary: 'Active incidents for dashboard' },
  }, async (_request, reply) => {
    const activeIncidents = await db
      .select({
        incident: incidents,
        channelName: channels.name,
      })
      .from(incidents)
      .innerJoin(channels, eq(incidents.channelId, channels.id))
      .where(eq(incidents.status, 'open'))
      .orderBy(desc(incidents.startedAt))
      .limit(20);

    return reply.send({
      data: activeIncidents.map((r) => toIncidentDto(r.incident, r.channelName)),
    });
  });

  app.get('/dashboard/status-summary', {
    schema: { tags: ['dashboard'], summary: 'Recent checks and problematic channels' },
  }, async (_request, reply) => {
    const recentChecks = await db
      .select()
      .from(channelChecks)
      .orderBy(desc(channelChecks.checkedAt))
      .limit(10);

    const problematic = await db
      .select()
      .from(channels)
      .where(
        and(
          eq(channels.monitorEnabled, true),
          eq(channels.enabled, true),
          gte(channels.consecutiveFailures, 1)
        )
      )
      .orderBy(desc(channels.consecutiveFailures))
      .limit(10);

    const { toChannelDto } = await import('../dto/mappers.js');

    return reply.send({
      recentChecks: recentChecks.map(toCheckDto),
      problematicChannels: problematic.map(toChannelDto),
    });
  });
}
