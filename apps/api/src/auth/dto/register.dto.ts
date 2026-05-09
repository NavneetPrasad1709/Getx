import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email').toLowerCase().trim().max(255),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password too long')
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[a-z]/, 'Must contain lowercase')
    .regex(/[0-9]/, 'Must contain number'),
  name: z.string().min(2, 'Name too short').max(50, 'Name too long').trim(),
  country: z.string().length(2, 'Use 2-letter country code').toUpperCase(),
  acceptTerms: z.literal(true, { error: () => 'You must accept terms' }),
  marketingOptIn: z.boolean().optional().default(false),
});

export type RegisterDto = z.infer<typeof RegisterSchema>;
