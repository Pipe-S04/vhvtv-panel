import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest } from 'fastify';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_HEADER = 'x-csrf-token';
const FORM_CONTENT_TYPES = [
  'application/x-www-form-urlencoded',
  'multipart/form-data',
  'text/plain',
];

export const csrfPlugin = fp(async (
  app: FastifyInstance,
  opts: { allowedOrigin?: string } = {}
): Promise<void> => {
  app.addHook('onRequest', async (request, reply) => {
    if (SAFE_METHODS.has(request.method)) return;

    const origin = headerValue(request, 'origin');
    if (origin && (!opts.allowedOrigin || origin !== opts.allowedOrigin)) {
      return reply.status(403).send({
        error: {
          code: 'CSRF_ORIGIN_DENIED',
          message: 'Request origin is not allowed.',
          requestId: String(request.id ?? ''),
        },
      });
    }

    const contentType = headerValue(request, 'content-type')?.toLowerCase() ?? '';
    const isBrowserFormPost = FORM_CONTENT_TYPES.some((type) => contentType.startsWith(type));
    if (isBrowserFormPost && !headerValue(request, CSRF_HEADER)) {
      return reply.status(403).send({
        error: {
          code: 'CSRF_TOKEN_REQUIRED',
          message: 'CSRF token header is required for browser form submissions.',
          requestId: String(request.id ?? ''),
        },
      });
    }
  });
}, { name: 'csrf' });

function headerValue(request: FastifyRequest, name: string): string | undefined {
  const value = request.headers[name];
  return Array.isArray(value) ? value[0] : value;
}
