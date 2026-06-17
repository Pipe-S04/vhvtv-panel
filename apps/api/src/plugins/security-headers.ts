import fp from 'fastify-plugin';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import type { FastifyInstance } from 'fastify';

const permissionsPolicy = [
  'camera=()',
  'geolocation=()',
  'microphone=()',
  'payment=()',
  'usb=()'
].join(', ');

export const securityHeadersPlugin = fp(
  async (app: FastifyInstance, opts: { corsOrigin?: string }): Promise<void> => {
    app.addHook('onRequest', async (_request, reply) => {
      reply.header('Permissions-Policy', permissionsPolicy);
    });

    await app.register(helmet, {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: []
        }
      },
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      crossOriginResourcePolicy: { policy: 'same-site' },
      hsts: {
        maxAge: 31_536_000,
        includeSubDomains: true,
        preload: true
      },
      referrerPolicy: { policy: 'no-referrer' }
    });

    await app.register(cors, {
      origin: opts.corsOrigin ?? false,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-CSRF-Token'],
      credentials: false,
      maxAge: 86_400
    });
  },
  { name: 'security-headers' }
);
