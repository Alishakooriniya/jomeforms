import { z } from 'zod';
import { isValidMobile, isValidNationalId } from '../utils/validation.js';
import { dateSchema, listQuerySchema, stringRecordSchema, tagsSchema, uuidSchema } from './common.validator.js';

const optionalMobile = z
  .string()
  .trim()
  .max(20)
  .refine((value) => !value || isValidMobile(value), 'Mobile number must be 11 digits starting with 09.')
  .optional();

const optionalNationalId = z
  .string()
  .trim()
  .max(20)
  .refine((value) => !value || isValidNationalId(value), 'National ID is invalid.')
  .optional();

const partyRoleSchema = z.enum(['buyer', 'seller', 'tenant', 'landlord', 'consultant']);
const propertyKindSchema = z.enum(['apartment', 'house', 'villa', 'land', 'office', 'store', 'warehouse']);
const dealKindSchema = z.enum(['sale', 'rent', 'mortgage', 'presale', 'partnership']);
const clientStatusSchema = z.enum(['new', 'in_progress', 'awaiting_docs', 'done', 'archived']);
const caseTypeSchema = z.enum(['document_request', 'rent_renewal']);

export const workflowStepSchema = z.object({
  id: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(200),
  kind: z.enum(['form', 'payment', 'external', 'completion']),
  status: z.enum(['pending', 'completed']),
  requiresEvidence: z.boolean(),
  evidenceIds: z.array(z.string().max(80)).default([]),
  completedAt: z.string().max(40).optional(),
  completedBy: z.string().max(120).optional(),
  overrideReason: z.string().max(1000).optional(),
});

export const clientListQuerySchema = listQuerySchema.extend({
  status: clientStatusSchema.optional(),
  caseType: caseTypeSchema.optional(),
  companyId: uuidSchema.optional(),
  agentName: z.string().trim().max(120).optional(),
});

const clientFields = {
  code: z.string().trim().max(60).optional(),
  fullName: z.string().trim().min(2, 'Full name is required.').max(160),
  nationalId: optionalNationalId,
  mobile: optionalMobile,
  caseType: caseTypeSchema.default('document_request'),
  companyId: z.union([uuidSchema, z.literal(''), z.null()]).optional(),
  workflow: z.array(workflowStepSchema).max(20).optional(),
  phone: z.string().trim().max(30).nullish(),
  email: z.union([z.string().trim().email('Email is invalid.').max(160), z.literal('')]).nullish(),
  fatherName: z.string().trim().max(120).nullish(),
  birthDate: z.union([dateSchema, z.literal('')]).nullish(),
  partyRole: partyRoleSchema.default('buyer'),
  party2Name: z.string().trim().max(160).nullish(),
  party2Role: partyRoleSchema.default('seller'),
  party2NationalId: z.string().trim().max(20).nullish(),
  party2Mobile: z.string().trim().max(20).nullish(),
  dealKind: dealKindSchema.default('sale'),
  status: clientStatusSchema.default('new'),
  province: z.string().trim().max(80).default(''),
  city: z.string().trim().max(80).default(''),
  address: z.string().trim().max(500).default(''),
  propertyKind: propertyKindSchema.default('apartment'),
  area: z.coerce.number().min(0).max(10_000_000).default(0),
  region: z.string().trim().max(120).nullish(),
  plate: z.string().trim().max(60).nullish(),
  unit: z.string().trim().max(30).nullish(),
  floor: z.string().trim().max(30).nullish(),
  buildYear: z.string().trim().max(20).nullish(),
  price: z.coerce.number().min(0).max(1_000_000_000_000_000).default(0),
  deposit: z.coerce.number().min(0).max(1_000_000_000_000_000).default(0),
  rent: z.coerce.number().min(0).max(1_000_000_000_000_000).default(0),
  commissionPercent: z.coerce.number().min(0).max(100).default(0.5),
  agentName: z.string().trim().max(120).nullish(),
  source: z.string().trim().max(120).nullish(),
  tags: tagsSchema.default([]),
  notes: z.string().trim().max(4000).nullish(),
  extra: stringRecordSchema.default({}),
};

export const createClientSchema = z.object(clientFields);

export const updateClientSchema = z
  .object(clientFields)
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'At least one field must be provided.');

export const clientStepParamsSchema = z.object({
  id: uuidSchema,
  stepId: z.string().trim().min(1).max(80),
});

export const workflowOverrideBodySchema = z.object({
  reason: z.string().trim().min(3, 'Override reason is required.').max(1000),
});
