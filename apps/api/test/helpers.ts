import { randomBytes } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { vi } from 'vitest';
import { buildApp } from '../src/app.js';

const TEST_MASTER_KEY = randomBytes(32);

export type MockDb = {
  execute: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

export function createMockDb(): MockDb {
  const chainable = () => {
    const obj: Record<string, unknown> = {};
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_target, prop) {
        if (prop === 'then') return undefined;
        if (typeof prop === 'string') {
          return () => new Proxy(obj, handler);
        }
        return undefined;
      },
    };
    return new Proxy(obj, handler);
  };

  return {
    execute: (() => { throw new Error('mock execute not configured'); }) as unknown as MockDb['execute'],
    select: (() => chainable()) as unknown as MockDb['select'],
    insert: (() => chainable()) as unknown as MockDb['insert'],
    update: (() => chainable()) as unknown as MockDb['update'],
    delete: (() => chainable()) as unknown as MockDb['delete'],
  };
}

export async function buildTestApp(dbOverride?: unknown): Promise<FastifyInstance> {
  const db = dbOverride ?? createMockDb();

  const app = await buildApp({
    db: db as never,
    masterKey: TEST_MASTER_KEY,
    logLevel: 'silent',
  });

  await app.ready();
  return app;
}

export function getMasterKey(): Buffer {
  return TEST_MASTER_KEY;
}
