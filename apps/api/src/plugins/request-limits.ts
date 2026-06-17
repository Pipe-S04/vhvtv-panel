import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest } from 'fastify';

const DEFAULT_BODY_LIMIT_BYTES = 1_048_576;
const DEFAULT_URL_LIMIT_BYTES = 4_096;
const METHODS_WITH_BODY = new Set(['POST', 'PUT', 'PATCH']);
const ALLOWED_BODY_TYPES = ['application/json'];

export const requestLimitsPlugin = fp(async (
  app: FastifyInstance,
  opts: { bodyLimitBytes?: number; urlLimitBytes?: number } = {}
): Promise<void> => {
  const bodyLimitBytes = opts.bodyLimitBytes ?? DEFAULT_BODY_LIMIT_BYTES;
  const urlLimitBytes = opts.urlLimitBytes ?? DEFAULT_URL_LIMIT_BYTES;

  app.addHook('onRequest', async (request, reply) => {
    if (Buffer.byteLength(request.url, 'utf8') > urlLimitBytes) {
      return reply.status(414).send({
        error: {
          code: 'URI_TOO_LONG',
          message: 'Request URI is too long.',
          requestId: String(request.id ?? ''),
        },
      });
    }

    const contentLength = parseContentLength(request);
    if (contentLength !== undefined && contentLength > bodyLimitBytes) {
      return reply.status(413).send({
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: 'Request body is too large.',
          requestId: String(request.id ?? ''),
        },
      });
    }

    if (METHODS_WITH_BODY.has(request.method) && contentLength && contentLength > 0) {
      const contentType = headerValue(request, 'content-type')?.toLowerCase() ?? '';
      const isAllowed = ALLOWED_BODY_TYPES.some((type) => contentType.startsWith(type));
      if (!isAllowed) {
        return reply.status(415).send({
          error: {
            code: 'UNSUPPORTED_MEDIA_TYPE',
            message: 'Only application/json request bodies are supported.',
            requestId: String(request.id ?? ''),
          },
        });
      }
    }
  });
}, { name: 'request-limits' });

function parseContentLength(request: FastifyRequest): number | undefined {
  const raw = headerValue(request, 'content-length');
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function headerValue(request: FastifyRequest, name: string): string | undefined {
  const value = request.headers[name];
  return Array.isArray(value) ? value[0] : value;
}
