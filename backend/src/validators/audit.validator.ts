import { z } from 'zod';
import { dateSchema, listQuerySchema, uuidSchema } from './common.validator.js';

const auditEntitySchema = z.enum([
  'auth',
  'client',
  'document',
  'template',
  'user',
  'role',
  'company',
  'settings',
  'scan',
  'workflow',
  'reminder',
  'letterhead',
]);

export const auditListQuerySchema = listQuerySchema.extend({
  entity: auditEntitySchema.optional(),
  userId: uuidSchema.optional(),
  from: dateSchema.optional(),
  to: dateSchema.optional(),
});
