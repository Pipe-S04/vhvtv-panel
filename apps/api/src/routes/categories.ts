import type { FastifyInstance } from 'fastify';
import { eq, count } from 'drizzle-orm';
import type { Database } from '@vhvtv/database';
import { categories, channels } from '@vhvtv/database';
import { toCategoryDto } from '../dto/mappers.js';
import { paginate, offsetFromPage } from '../dto/pagination.js';
import { paginationQuerySchema, categoryIdParamSchema } from '../schemas/common.js';
import { ApiError } from '../plugins/error-handler.js';

export async function categoryRoutes(app: FastifyInstance, opts: { db: Database }): Promise<void> {
  const { db } = opts;

  app.get('/categories', {
    schema: { tags: ['categories'], summary: 'List all categories' },
  }, async (request, reply) => {
    const query = paginationQuerySchema.parse(request.query);
    const offset = offsetFromPage(query.page, query.limit);

    const [rows, totalResult] = await Promise.all([
      db.select().from(categories).limit(query.limit).offset(offset).orderBy(categories.name),
      db.select({ count: count() }).from(categories),
    ]);

    return reply.send(paginate(rows.map(toCategoryDto), Number(totalResult[0]?.count ?? 0), query.page, query.limit));
  });

  app.get('/categories/:categoryId', {
    schema: { tags: ['categories'], summary: 'Get a single category with channel count' },
  }, async (request, reply) => {
    const { categoryId } = categoryIdParamSchema.parse(request.params);

    const [category] = await db.select().from(categories).where(eq(categories.id, categoryId)).limit(1);
    if (!category) throw new ApiError(404, 'NOT_FOUND', 'Category not found.');

    const channelCount = await db
      .select({ count: count() })
      .from(channels)
      .where(eq(channels.categoryId, categoryId));

    return reply.send({
      ...toCategoryDto(category),
      channelCount: Number(channelCount[0]?.count ?? 0),
    });
  });
}
