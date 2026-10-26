import { z } from 'zod';

export const updateSettingsSchema = z
  .object({
    orgPhone: z.string().trim().max(40).optional(),
    orgAddress: z.string().trim().max(500).optional(),
    defaultProvince: z.string().trim().max(80).optional(),
    defaultCity: z.string().trim().max(80).optional(),
    docPrefix: z.string().trim().min(1).max(10).optional(),
    clientPrefix: z.string().trim().min(1).max(10).optional(),
    showPersianDigits: z.boolean().optional(),
    defaultPageSize: z.coerce.number().int().min(5).max(100).optional(),
    contractNote: z.string().max(4000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field must be provided.');
