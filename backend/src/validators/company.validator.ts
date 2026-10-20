import { z } from 'zod';
import { booleanQuery, listQuerySchema, uuidSchema } from './common.validator.js';

const companyKindSchema = z.enum(['owner', 'developer', 'cooperative', 'investor', 'org', 'other']);

export const companyListQuerySchema = listQuerySchema.extend({
  kind: companyKindSchema.optional(),
  active: booleanQuery,
});

export const createCompanySchema = z.object({
  name: z.string().trim().min(2, 'Company name is required.').max(160),
  kind: companyKindSchema.default('other'),
  nationalId: z.string().trim().max(20).nullish(),
  managerName: z.string().trim().max(120).nullish(),
  mobile: z.string().trim().max(20).nullish(),
  phone: z.string().trim().max(30).nullish(),
  address: z.string().trim().max(500).nullish(),
  plotCount: z.coerce.number().int().min(0).max(1_000_000).default(0),
  totalArea: z.coerce.number().min(0).max(1_000_000_000).default(0),
  note: z.string().trim().max(1000).nullish(),
  active: z.boolean().default(true),
});

export const updateCompanySchema = createCompanySchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'At least one field must be provided.');

export const companyMembersBodySchema = z.object({
  userIds: z.array(uuidSchema).max(1000),
});
