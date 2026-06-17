import { z } from 'zod';
import { decodeMasterKey } from './crypto.js';
import { loadSecret } from './secrets.js';

export const appConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  POSTGRES_DB: z.string().min(1),
  POSTGRES_USER: z.string().min(1),
  POSTGRES_PASSWORD: z.string().min(1),
  DATABASE_HOST: z.string().min(1).default('localhost'),
  DATABASE_PORT: z.coerce.number().int().min(1).max(65535).default(5432),
  API_BIND: z.string().min(1).default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  WEB_BIND: z.string().min(1).default('127.0.0.1:3000'),
  NEXT_PUBLIC_API_BASE_URL: z.string().min(1).default('/api'),
  API_PUBLIC_ORIGIN: z.string().url(),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(1).default(1),
  WORKER_COOLDOWN_MS: z.coerce.number().int().min(1000).default(3000),
  WORKER_POLL_INTERVAL_MS: z.coerce.number().int().min(1000).default(5000),
  DEFAULT_CHECK_TIMEOUT_MS: z.coerce.number().int().min(5000).max(120000).default(30000),
  TELEGRAM_ALERTS_ENABLED: z.coerce.boolean().default(false),
  MASTER_KEY: z.string().transform((value) => decodeMasterKey(value))
});

export type AppConfig = z.infer<typeof appConfigSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return appConfigSchema.parse({
    ...env,
    POSTGRES_PASSWORD: env.POSTGRES_PASSWORD ?? loadSecret('POSTGRES_PASSWORD', { env }),
    MASTER_KEY: env.MASTER_KEY ?? loadSecret('MASTER_KEY', { env })
  });
}
