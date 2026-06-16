import { z } from 'zod';
import { PROVIDER_TYPES } from '@vhvtv/database';

export const createProviderSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(PROVIDER_TYPES),
  baseUrl: z.string().url().max(2048),
  username: z.string().max(255).optional(),
  password: z.string().max(255).optional(),
  enabled: z.boolean().default(true),
});

export const updateProviderSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  baseUrl: z.string().url().max(2048).optional(),
  username: z.string().max(255).optional(),
  password: z.string().max(255).optional(),
  enabled: z.boolean().optional(),
});

export type CreateProviderInput = z.infer<typeof createProviderSchema>;
export type UpdateProviderInput = z.infer<typeof updateProviderSchema>;
