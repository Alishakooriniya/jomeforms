import { z } from 'zod';

export const loginBodySchema = z.object({
  username: z.string().trim().min(1, 'Username is required.').max(80),
  password: z.string().min(1, 'Password is required.').max(200),
});

export const changePasswordBodySchema = z
  .object({
    currentPassword: z.string().min(1).max(200),
    newPassword: z.string().min(8).max(200),
    confirmPassword: z.string().min(1).max(200),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  });

export type LoginBody = z.infer<typeof loginBodySchema>;
