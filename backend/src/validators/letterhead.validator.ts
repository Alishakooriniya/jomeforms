import { z } from 'zod';
import { listQuerySchema, stringRecordSchema, uuidSchema } from './common.validator.js';

export const updateLetterheadSchema = z.object({
  address: z.string().trim().max(2000).optional(),
});

export const recordLetterheadPrintSchema = z.object({
  paper: z.enum(['A4', 'A5']),
  kind: z.enum(['blank', 'filled']),
  values: stringRecordSchema.optional(),
});

export const letterheadPrintListQuerySchema = listQuerySchema.extend({
  userId: uuidSchema.optional(),
  paper: z.enum(['A4', 'A5']).optional(),
  kind: z.enum(['blank', 'filled']).optional(),
});
