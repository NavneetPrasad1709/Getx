import { z } from 'zod';

// PAY-HIGH-021: only UPI accepted until CARD/BANK tokenisation ships.
// Accepting CARD/BANK with no validation creates attacker-injectable rows
// that future code trusting `type === 'CARD'` would fall back to.
export const CreatePaymentMethodSchema = z
  .object({
    type: z.literal('UPI'),
    upiId: z
      .string()
      .min(3)
      .max(100)
      .regex(/^[\w.-]+@[\w.-]+$/i, 'Invalid UPI ID'),
    label: z.string().max(40).optional().nullable(),
    isDefault: z.boolean().optional(),
  });
export type CreatePaymentMethodDto = z.infer<typeof CreatePaymentMethodSchema>;

export const UpdatePaymentMethodSchema = z.object({
  upiId: z
    .string()
    .min(3)
    .max(100)
    .regex(/^[\w.-]+@[\w.-]+$/i, 'Invalid UPI ID')
    .optional(),
  label: z.string().max(40).optional().nullable(),
  isDefault: z.boolean().optional(),
});
export type UpdatePaymentMethodDto = z.infer<typeof UpdatePaymentMethodSchema>;
