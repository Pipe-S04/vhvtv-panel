import Fastify, { type FastifyInstance } from 'fastify';
import { pinoRedactionPaths } from '@vhvtv/shared';
import type { Database } from '@vhvtv/database';
import { requestIdPlugin } from './plugins/request-id.js';
import { securityHeadersPlugin } from './plugins/security-headers.js';
import { rateLimitPlugin } from './plugins/rate-limit.js';
import { errorHandlerPlugin } from './plugins/error-handler.js';
import { openapiPlugin } from './plugins/openapi.js';
import { healthRoutes } from './routes/health.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { providerRoutes } from './routes/providers.js';
import { categoryRoutes } from './routes/categories.js';
import { channelRoutes } from './routes/channels.js';
import { incidentRoutes } from './routes/incidents.js';
import { statisticsRoutes } from './routes/statistics.js';
import { settingsRoutes } from './routes/settings.js';
import { monitoringRoutes } from './routes/monitoring.js';

export type AppOptions = {
  db: Database;
  masterKey: Buffer;
  corsOrigin?: string;
  logLevel?: string;
  trustProxy?: boolean;
};

export async function buildApp(options: AppOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: options.logLevel ?? 'info',
      redact: pinoRedactionPaths,
    },
    trustProxy: options.trustProxy ?? false,
    bodyLimit: 1_048_576, // 1 MB
    requestIdHeader: false,
    genReqId: () => '',
  });

  await app.register(requestIdPlugin);
  await app.register(errorHandlerPlugin);
  await app.register(securityHeadersPlugin, {
    ...(options.corsOrigin !== undefined ? { corsOrigin: options.corsOrigin } : {}),
  });
  await app.register(rateLimitPlugin);
  await app.register(openapiPlugin);

  await app.register(
    async (v1) => {
      await v1.register(healthRoutes, { db: options.db });
      await v1.register(dashboardRoutes, { db: options.db });
      await v1.register(providerRoutes, { db: options.db, masterKey: options.masterKey });
      await v1.register(categoryRoutes, { db: options.db });
      await v1.register(channelRoutes, { db: options.db });
      await v1.register(incidentRoutes, { db: options.db });
      await v1.register(statisticsRoutes, { db: options.db });
      await v1.register(settingsRoutes, { db: options.db });
      await v1.register(monitoringRoutes, { db: options.db });
    },
    { prefix: '/api/v1' }
  );

  return app;
}
