import type { FastifyInstance } from 'fastify';
import { eq, count } from 'drizzle-orm';
import type { Database } from '@vhvtv/database';
import { providers, channels } from '@vhvtv/database';
import { encryptString, type EncryptedPayload } from '@vhvtv/config';
import { toProviderDto } from '../dto/mappers.js';
import { paginate, offsetFromPage } from '../dto/pagination.js';
import { paginationQuerySchema, uuidParamSchema } from '../schemas/common.js';
import { createProviderSchema, updateProviderSchema } from '../schemas/provider.js';
import { ApiError } from '../plugins/error-handler.js';

export async function providerRoutes(
  app: FastifyInstance,
  opts: { db: Database; masterKey: Buffer }
): Promise<void> {
  const { db, masterKey } = opts;

  app.get('/providers', {
    schema: { tags: ['providers'], summary: 'List all providers' },
  }, async (request, reply) => {
    const query = paginationQuerySchema.parse(request.query);
    const offset = offsetFromPage(query.page, query.limit);

    const [rows, totalResult] = await Promise.all([
      db.select().from(providers).limit(query.limit).offset(offset).orderBy(providers.name),
      db.select({ count: count() }).from(providers),
    ]);

    return reply.send(paginate(rows.map(toProviderDto), Number(totalResult[0]?.count ?? 0), query.page, query.limit));
  });

  app.post('/providers', {
    schema: { tags: ['providers'], summary: 'Create a new provider' },
  }, async (request, reply) => {
    const body = createProviderSchema.parse(request.body);

    let usernameEncrypted: string | null = null;
    let passwordEncrypted: string | null = null;
    let encryptionNonce: string | null = null;
    let encryptionTag: string | null = null;

    if (body.username) {
      const payload = encryptString(body.username, masterKey);
      usernameEncrypted = payload.ciphertext;
      encryptionNonce = payload.iv;
      encryptionTag = payload.tag;
    }

    if (body.password) {
      const payload: EncryptedPayload = encryptString(body.password, masterKey);
      passwordEncrypted = payload.ciphertext;
      if (!encryptionNonce) {
        encryptionNonce = payload.iv;
        encryptionTag = payload.tag;
      }
    }

    const [created] = await db
      .insert(providers)
      .values({
        name: body.name,
        type: body.type,
        baseUrl: body.baseUrl,
        usernameEncrypted,
        passwordEncrypted,
        encryptionNonce,
        encryptionTag,
        enabled: body.enabled,
      })
      .returning();

    return reply.status(201).send(toProviderDto(created!));
  });

  app.get('/providers/:providerId', {
    schema: { tags: ['providers'], summary: 'Get a single provider' },
  }, async (request, reply) => {
    const { providerId } = uuidParamSchema.parse(request.params);
    const [provider] = await db.select().from(providers).where(eq(providers.id, providerId)).limit(1);
    if (!provider) throw new ApiError(404, 'NOT_FOUND', 'Provider not found.');
    return reply.send(toProviderDto(provider));
  });

  app.patch('/providers/:providerId', {
    schema: { tags: ['providers'], summary: 'Update a provider' },
  }, async (request, reply) => {
    const { providerId } = uuidParamSchema.parse(request.params);
    const body = updateProviderSchema.parse(request.body);

    const [existing] = await db.select().from(providers).where(eq(providers.id, providerId)).limit(1);
    if (!existing) throw new ApiError(404, 'NOT_FOUND', 'Provider not found.');

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) updates.name = body.name;
    if (body.baseUrl !== undefined) updates.baseUrl = body.baseUrl;
    if (body.enabled !== undefined) updates.enabled = body.enabled;

    if (body.username !== undefined) {
      const payload = encryptString(body.username, masterKey);
      updates.usernameEncrypted = payload.ciphertext;
      updates.encryptionNonce = payload.iv;
      updates.encryptionTag = payload.tag;
    }
    if (body.password !== undefined) {
      const payload = encryptString(body.password, masterKey);
      updates.passwordEncrypted = payload.ciphertext;
      if (!updates.encryptionNonce) {
        updates.encryptionNonce = payload.iv;
        updates.encryptionTag = payload.tag;
      }
    }

    const [updated] = await db
      .update(providers)
      .set(updates)
      .where(eq(providers.id, providerId))
      .returning();

    return reply.send(toProviderDto(updated!));
  });

  app.delete('/providers/:providerId', {
    schema: { tags: ['providers'], summary: 'Delete a provider and all its channels' },
  }, async (request, reply) => {
    const { providerId } = uuidParamSchema.parse(request.params);

    const [existing] = await db.select({ id: providers.id }).from(providers).where(eq(providers.id, providerId)).limit(1);
    if (!existing) throw new ApiError(404, 'NOT_FOUND', 'Provider not found.');

    await db.delete(providers).where(eq(providers.id, providerId));
    return reply.status(204).send();
  });

  app.post('/providers/:providerId/test', {
    schema: { tags: ['providers'], summary: 'Test provider connectivity' },
  }, async (request, reply) => {
    const { providerId } = uuidParamSchema.parse(request.params);
    const [provider] = await db.select().from(providers).where(eq(providers.id, providerId)).limit(1);
    if (!provider) throw new ApiError(404, 'NOT_FOUND', 'Provider not found.');

    try {
      const url = new URL(provider.baseUrl);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
      const response = await fetch(url.toString(), { method: 'HEAD', signal: controller.signal });
      clearTimeout(timeout);
      return reply.send({ success: response.ok, statusCode: response.status });
    } catch {
      return reply.send({ success: false, statusCode: null });
    }
  });

  app.post('/providers/:providerId/import', {
    schema: { tags: ['providers'], summary: 'Import channels from provider' },
  }, async (request, reply) => {
    const { providerId } = uuidParamSchema.parse(request.params);
    const [provider] = await db.select().from(providers).where(eq(providers.id, providerId)).limit(1);
    if (!provider) throw new ApiError(404, 'NOT_FOUND', 'Provider not found.');

    const channelCount = await db.select({ count: count() }).from(channels).where(eq(channels.providerId, providerId));

    return reply.status(202).send({
      message: 'Import started.',
      providerId,
      existingChannels: Number(channelCount[0]?.count ?? 0),
    });
  });
}
