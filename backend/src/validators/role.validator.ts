import { z } from 'zod';
import { PERMISSION_KEYS } from '../config/permissions.js';
import { booleanQuery, listQuerySchema } from './common.validator.js';

const permissionKeySchema = z.enum(PERMISSION_KEYS as [string, ...string[]]);

export const roleListQuerySchema = listQuerySchema.extend({
  system: booleanQuery,
});

export const createRoleSchema = z.object({
  name: z.string().trim().min(2, 'Role name is required.').max(80),
  description: z.string().trim().max(300).optional(),
  permissions: z.array(permissionKeySchema).max(PERMISSION_KEYS.length).default([]),
});

export const updateRoleSchema = createRoleSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'At least one field must be provided.');
