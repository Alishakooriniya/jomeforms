import { z } from 'zod';
import { dateSchema, listQuerySchema, stringRecordSchema, tagsSchema, uuidSchema } from './common.validator.js';

const documentStatusSchema = z.enum(['draft', 'awaiting_signature', 'signed', 'scanned', 'archived']);

export const documentListQuerySchema = listQuerySchema.extend({
  status: documentStatusSchema.optional(),
  templateId: uuidSchema.optional(),
  clientId: uuidSchema.optional(),
  createdBy: uuidSchema.optional(),
  from: dateSchema.optional(),
  to: dateSchema.optional(),
});

export const createDocumentSchema = z.object({
  templateId: uuidSchema,
  clientId: uuidSchema.nullish(),
  values: stringRecordSchema.optional(),
  status: documentStatusSchema.optional(),
  tags: tagsSchema.optional(),
  notes: z.string().trim().max(4000).optional(),
});

export const updateDocumentSchema = z
  .object({
    title: z.string().trim().min(2).max(200).optional(),
    values: stringRecordSchema.optional(),
    tags: tagsSchema.optional(),
    notes: z.string().trim().max(4000).nullish(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field must be provided.');

export const documentStatusSchemaBody = z.object({
  status: documentStatusSchema,
});

export const scanParamsSchema = z.object({
  id: uuidSchema,
  scanId: uuidSchema,
});
