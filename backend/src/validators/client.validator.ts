import { z } from 'zod';
import { isValidMobile, isValidNationalId } from '../utils/validation.js';
import { dateSchema, listQuerySchema, uuidSchema } from './common.validator.js';

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
  fatherName: z.string().trim().max(120).nullish(),
  birthDate: z
    .union([dateSchema, z.literal('')])
    .nullish()
    .transform((value) => (value === '' ? null : value)),
  status: clientStatusSchema.default('new'),
  residenceAddress: z.string().trim().max(500).nullish(),
};

export const createClientSchema = z.object(clientFields).strict();

export const updateClientSchema = z
  .object(clientFields)
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'At least one field must be provided.');

export const clientStepParamsSchema = z.object({
  id: uuidSchema,
  stepId: z.string().trim().min(1).max(80),
});

export const workflowOverrideBodySchema = z.object({
  reason: z.string().trim().min(3, 'Override reason is required.').max(1000),
});
