import { z } from 'zod';
import { normalizeJalaliDate } from '../utils/jalali.js';

export const uuidSchema = z.string().uuid('Must be a valid UUID.');

export const idParamsSchema = z.object({ id: uuidSchema });

export const booleanQuery = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true')
  .optional();

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional(),
  sortBy: z.string().trim().max(60).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ListQueryInput = z.infer<typeof listQuerySchema>;

export const dateSchema = z
  .string()
  .trim()
  .refine((value) => normalizeJalaliDate(value) !== null, 'Expected a valid Jalali date in YYYY/MM/DD format.')
  .transform((value) => normalizeJalaliDate(value) ?? value);

export const tagsSchema = z.array(z.string().trim().min(1).max(60)).max(30);

export const stringRecordSchema = z.record(z.string(), z.string());
