import { z } from 'zod';
import { CHANNEL_PRIORITIES, CHANNEL_STATUSES } from '@vhvtv/database';
import { paginationQuerySchema } from './common.js';

export const updateChannelSchema = z.object({
  enabled: z.boolean().optional(),
  monitorEnabled: z.boolean().optional(),
  priority: z.enum(CHANNEL_PRIORITIES).optional(),
  checkIntervalMinutes: z.number().int().min(1).max(1440).optional(),
  checkDurationSeconds: z.number().int().min(5).max(120).optional(),
});

export const channelFilterSchema = paginationQuerySchema.extend({
  providerId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  status: z.enum(CHANNEL_STATUSES).optional(),
  monitorEnabled: z.coerce.boolean().optional(),
  search: z.string().max(200).optional(),
});

export const bulkMonitorSchema = z.object({
  channelIds: z.array(z.string().uuid()).min(1).max(500),
  monitorEnabled: z.boolean(),
});

export type UpdateChannelInput = z.infer<typeof updateChannelSchema>;
export type ChannelFilter = z.infer<typeof channelFilterSchema>;
export type BulkMonitorInput = z.infer<typeof bulkMonitorSchema>;
