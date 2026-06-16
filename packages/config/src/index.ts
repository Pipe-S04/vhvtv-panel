import { z } from 'zod';

export * from './config.js';
export * from './crypto.js';
export * from './secrets.js';

const integerFromEnv = z.coerce.number().int().nonnegative();

export const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  POSTGRES_DB: z.string().min(1),
  POSTGRES_USER: z.string().min(1),
  POSTGRES_PASSWORD: z.string().min(1).optional(),
  WEB_BIND: z.string().min(1).default('127.0.0.1:3000'),
  NEXT_PUBLIC_API_BASE_URL: z.string().min(1).default('/api'),
  API_PUBLIC_ORIGIN: z.string().url(),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(1).default(1),
  WORKER_COOLDOWN_MS: integerFromEnv.default(3000),
  WORKER_POLL_INTERVAL_MS: integerFromEnv.default(5000),
  DEFAULT_CHECK_TIMEOUT_MS: integerFromEnv.default(30000),
  TELEGRAM_ALERTS_ENABLED: z.coerce.boolean().default(false)
});

export type BaseEnv = z.infer<typeof baseEnvSchema>;

export function parseBaseEnv(env: NodeJS.ProcessEnv): BaseEnv {
  return baseEnvSchema.parse(env);
}
