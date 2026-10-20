import { z } from 'zod';
import { PERMISSION_KEYS } from '../config/permissions.js';
import { booleanQuery, listQuerySchema, uuidSchema } from './common.validator.js';

const permissionKeySchema = z.enum(PERMISSION_KEYS as [string, ...string[]]);
const roleSchema = z.enum(['superadmin', 'admin']);

const userBase = {
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters.')
    .max(40)
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Username may only contain letters, numbers, ".", "_" or "-".'),
  fullName: z.string().trim().min(2, 'Full name is required.').max(120),
  role: roleSchema,
  permissions: z.array(permissionKeySchema).max(PERMISSION_KEYS.length).default([]),
  title: z.string().trim().max(80).optional(),
  mobile: z.string().trim().max(20).optional(),
  companyId: uuidSchema.nullish(),
  active: z.boolean().optional(),
  note: z.string().trim().max(1000).optional(),
};

export const createUserSchema = z.object({
  ...userBase,
  password: z.string().min(8, 'Password must be at least 8 characters.').max(200),
});

export const updateUserSchema = z
  .object({
    username: userBase.username.optional(),
    fullName: userBase.fullName.optional(),
    role: roleSchema.optional(),
    permissions: z.array(permissionKeySchema).max(PERMISSION_KEYS.length).optional(),
    title: z.string().trim().max(80).nullish(),
    mobile: z.string().trim().max(20).nullish(),
    companyId: uuidSchema.nullish(),
    active: z.boolean().optional(),
    note: z.string().trim().max(1000).nullish(),
    password: z.string().min(8, 'Password must be at least 8 characters.').max(200).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field must be provided.');

export const userListQuerySchema = listQuerySchema.extend({
  role: roleSchema.optional(),
  active: booleanQuery,
  companyId: uuidSchema.optional(),
});

export const userPermissionsBodySchema = z.object({
  permissions: z.array(permissionKeySchema).max(PERMISSION_KEYS.length),
});

export const userStatusBodySchema = z.object({
  active: z.boolean(),
});
