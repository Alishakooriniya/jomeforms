import { z } from 'zod';
import { booleanQuery, dateSchema, listQuerySchema, uuidSchema } from './common.validator.js';

const timeSchema = z
  .string()
  .trim()
  .regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/, 'Expected HH:MM.');

export const reminderListQuerySchema = listQuerySchema.extend({
  userId: uuidSchema.optional(),
  done: booleanQuery,
});

export const createReminderSchema = z.object({
  title: z.string().trim().min(1, 'Reminder text is required.').max(300),
  note: z.string().trim().max(1000).optional(),
  date: dateSchema,
  time: timeSchema.optional(),
  userId: uuidSchema,
});
