import { z } from 'zod';

export const loginBodySchema = z.object({
  username: z.string().trim().min(1, 'Username is required.').max(80),
  password: z.string().min(1, 'Password is required.').max(200),
});

export type LoginBody = z.infer<typeof loginBodySchema>;
