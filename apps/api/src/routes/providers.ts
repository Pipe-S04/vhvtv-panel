import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { eq, count } from 'drizzle-orm';
import type { Database } from '@vhvtv/database';
import { providers, channels } from '@vhvtv/database';
import { encryptSecretField } from '@vhvtv/config';
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

    const providerId = randomUUID();
    let usernameEncrypted: string | null = null;
    let passwordEncrypted: string | null = null;

    if (body.username) {
      usernameEncrypted = encryptSecretField(body.username, masterKey, providerCredentialAad(providerId, 'username'));
    }

    if (body.password) {
      passwordEncrypted = encryptSecretField(body.password, masterKey, providerCredentialAad(providerId, 'password'));
    }

    const [created] = await db
      .insert(providers)
      .values({
        id: providerId,
        name: body.name,
        type: body.type,
        baseUrl: body.baseUrl,
        usernameEncrypted,
        passwordEncrypted,
        encryptionNonce: null,
        encryptionTag: null,
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
      updates.usernameEncrypted = encryptSecretField(
        body.username,
        masterKey,
        providerCredentialAad(providerId, 'username')
      );
      updates.encryptionNonce = null;
      updates.encryptionTag = null;
    }
    if (body.password !== undefined) {
      updates.passwordEncrypted = encryptSecretField(
        body.password,
        masterKey,
        providerCredentialAad(providerId, 'password')
      );
      updates.encryptionNonce = null;
      updates.encryptionTag = null;
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

function providerCredentialAad(providerId: string, field: 'username' | 'password'): string {
  return `provider:${providerId}:${field}`;
}
