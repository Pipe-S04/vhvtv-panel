import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import type { FastifyInstance } from 'fastify';

export const openapiPlugin = fp(async (app: FastifyInstance): Promise<void> => {
  await app.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'VHV TV Panel API',
        description: 'IPTV Stream Monitoring Panel API',
        version: '1.0.0',
      },
      servers: [{ url: '/api/v1', description: 'API v1' }],
      tags: [
        { name: 'health', description: 'Health check endpoints' },
        { name: 'dashboard', description: 'Dashboard overview' },
        { name: 'providers', description: 'IPTV provider management' },
        { name: 'categories', description: 'Channel categories' },
        { name: 'channels', description: 'Channel management' },
        { name: 'incidents', description: 'Incident tracking' },
        { name: 'statistics', description: 'Statistics and analytics' },
        { name: 'settings', description: 'System settings' },
        { name: 'monitoring', description: 'Monitoring control' },
      ],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
  });
}, { name: 'openapi' });
