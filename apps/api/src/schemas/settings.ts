import { z } from 'zod';

export const updateSettingsSchema = z.record(
  z.string().min(1).max(100),
  z.union([z.string(), z.number(), z.boolean()])
);

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
