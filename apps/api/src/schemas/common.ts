import { z } from 'zod';

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const uuidParamSchema = z.object({
  providerId: z.string().uuid(),
});

export const channelIdParamSchema = z.object({
  channelId: z.string().uuid(),
});

export const categoryIdParamSchema = z.object({
  categoryId: z.string().uuid(),
});

export const incidentIdParamSchema = z.object({
  incidentId: z.string().uuid(),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
