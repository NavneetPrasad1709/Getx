import { z } from 'zod';

/* v1 supports UPI only. Card/Bank slots are reserved for future
   tokenised payment flows. */
export const CreatePaymentMethodSchema = z.object({
  type: z.enum(['UPI', 'CARD', 'BANK']).default('UPI'),
  upiId: z
    .string()
    .min(3)
    .max(100)
    .regex(/^[\w.\-]+@[\w.\-]+$/i, 'Invalid UPI ID')
    .optional(),
  label: z.string().max(40).optional().nullable(),
  isDefault: z.boolean().optional(),
}).refine(
  (d) => d.type !== 'UPI' || !!d.upiId,
  { message: 'UPI ID required for type=UPI', path: ['upiId'] },
);
export type CreatePaymentMethodDto = z.infer<typeof CreatePaymentMethodSchema>;

export const UpdatePaymentMethodSchema = z.object({
  upiId: z
    .string()
    .min(3)
    .max(100)
    .regex(/^[\w.\-]+@[\w.\-]+$/i, 'Invalid UPI ID')
    .optional(),
  label: z.string().max(40).optional().nullable(),
  isDefault: z.boolean().optional(),
});
export type UpdatePaymentMethodDto = z.infer<typeof UpdatePaymentMethodSchema>;
