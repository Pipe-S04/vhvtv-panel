import type { FastifyInstance } from 'fastify';
import { eq, desc, count, and } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { Database } from '@vhvtv/database';
import { incidents, channels } from '@vhvtv/database';
import { toIncidentDto } from '../dto/mappers.js';
import { paginate, offsetFromPage } from '../dto/pagination.js';
import { incidentIdParamSchema, paginationQuerySchema } from '../schemas/common.js';
import { ApiError } from '../plugins/error-handler.js';
import { z } from 'zod';

const incidentFilterSchema = paginationQuerySchema.extend({
  status: z.enum(['open', 'resolved']).optional(),
  channelId: z.string().uuid().optional(),
});

export async function incidentRoutes(app: FastifyInstance, opts: { db: Database }): Promise<void> {
  const { db } = opts;

  app.get('/incidents', {
    schema: { tags: ['incidents'], summary: 'List incidents' },
  }, async (request, reply) => {
    const query = incidentFilterSchema.parse(request.query);
    const offset = offsetFromPage(query.page, query.limit);

    const conditions: SQL[] = [];
    if (query.status) conditions.push(eq(incidents.status, query.status));
    if (query.channelId) conditions.push(eq(incidents.channelId, query.channelId));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, totalResult] = await Promise.all([
      db
        .select({ incident: incidents, channelName: channels.name })
        .from(incidents)
        .innerJoin(channels, eq(incidents.channelId, channels.id))
        .where(where)
        .limit(query.limit)
        .offset(offset)
        .orderBy(desc(incidents.startedAt)),
      db.select({ count: count() }).from(incidents).where(where),
    ]);

    return reply.send(
      paginate(
        rows.map((r) => toIncidentDto(r.incident, r.channelName)),
        Number(totalResult[0]?.count ?? 0),
        query.page,
        query.limit
      )
    );
  });

  app.get('/incidents/:incidentId', {
    schema: { tags: ['incidents'], summary: 'Get a single incident' },
  }, async (request, reply) => {
    const { incidentId } = incidentIdParamSchema.parse(request.params);

    const [row] = await db
      .select({ incident: incidents, channelName: channels.name })
      .from(incidents)
      .innerJoin(channels, eq(incidents.channelId, channels.id))
      .where(eq(incidents.id, incidentId))
      .limit(1);

    if (!row) throw new ApiError(404, 'NOT_FOUND', 'Incident not found.');
    return reply.send(toIncidentDto(row.incident, row.channelName));
  });

  app.post('/incidents/:incidentId/acknowledge', {
    schema: { tags: ['incidents'], summary: 'Acknowledge an incident' },
  }, async (request, reply) => {
    const { incidentId } = incidentIdParamSchema.parse(request.params);

    const [incident] = await db.select().from(incidents).where(eq(incidents.id, incidentId)).limit(1);
    if (!incident) throw new ApiError(404, 'NOT_FOUND', 'Incident not found.');
    if (incident.status === 'resolved') throw new ApiError(409, 'ALREADY_RESOLVED', 'Incident is already resolved.');

    return reply.send({
      message: 'Incident acknowledged.',
      incidentId,
    });
  });
}
