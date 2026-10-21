import { z } from 'zod';
import { booleanQuery, listQuerySchema } from './common.validator.js';
import { normalizeJalaliDate } from '../utils/jalali.js';

const categorySchema = z.enum(['sale', 'rent', 'mortgage', 'presale', 'commission', 'visit', 'other']);
const printLayoutSchema = z.enum(['document-request-a4']);

const fieldTypeSchema = z.enum([
  'text',
  'textarea',
  'number',
  'currency',
  'percent',
  'date',
  'select',
  'checkbox',
  'nationalId',
  'mobile',
]);

export const templateFieldSchema = z
  .object({
    id: z.string().trim().min(1).max(80),
    key: z
      .string()
      .trim()
      .min(1)
      .max(60)
      .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, 'Field key must start with a letter and contain only letters, digits and "_".'),
    label: z.string().trim().min(1).max(160),
    type: fieldTypeSchema,
    required: z.boolean(),
    options: z.array(z.string().trim().max(120)).max(100).optional(),
    source: z.string().trim().max(60).optional(),
    placeholder: z.string().trim().max(200).optional(),
    help: z.string().trim().max(400).optional(),
    group: z.string().trim().max(80).optional(),
    suffix: z.string().trim().max(20).optional(),
    defaultValue: z.string().max(500).optional(),
  })
  .superRefine((field, ctx) => {
    if (field.type === 'date' && field.defaultValue?.trim() && !normalizeJalaliDate(field.defaultValue)) {
      ctx.addIssue({
        code: 'custom',
        path: ['defaultValue'],
        message: 'Date field defaults must be valid Jalali dates in YYYY/MM/DD format.',
      });
    }
  })
  .transform((field) => {
    if (field.type !== 'date' || !field.defaultValue?.trim()) return field;
    const normalized = normalizeJalaliDate(field.defaultValue);
    return normalized ? { ...field, defaultValue: normalized } : field;
  });

const fieldsSchema = z
  .array(templateFieldSchema)
  .min(1, 'At least one field is required.')
  .max(100)
  .superRefine((fields, ctx) => {
    const seen = new Set<string>();
    fields.forEach((field, index) => {
      if (seen.has(field.key)) {
        ctx.addIssue({
          code: 'custom',
          path: [index, 'key'],
          message: `Duplicate field key "${field.key}".`,
        });
      }
      seen.add(field.key);
    });
  });

export const templateListQuerySchema = listQuerySchema.extend({
  category: categorySchema.optional(),
  active: booleanQuery,
});

export const createTemplateSchema = z.object({
  title: z.string().trim().min(2, 'Template title is required.').max(200),
  category: categorySchema.default('other'),
  printLayout: printLayoutSchema.nullish(),
  description: z.string().trim().max(1000).nullish(),
  fields: fieldsSchema,
  body: z.string().max(50_000).default(''),
  headerNote: z.string().max(2000).nullish(),
  footerNote: z.string().max(2000).nullish(),
  requiresSignature: z.boolean().default(true),
  active: z.boolean().default(true),
  version: z.coerce.number().int().min(1).max(10_000).default(1),
});

export const updateTemplateSchema = z
  .object({
    title: z.string().trim().min(2).max(200).optional(),
    category: categorySchema.optional(),
    printLayout: printLayoutSchema.nullish().optional(),
    description: z.string().trim().max(1000).nullish(),
    fields: fieldsSchema.optional(),
    body: z.string().max(50_000).optional(),
    headerNote: z.string().max(2000).nullish(),
    footerNote: z.string().max(2000).nullish(),
    requiresSignature: z.boolean().optional(),
    active: z.boolean().optional(),
    version: z.coerce.number().int().min(1).max(10_000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field must be provided.');
