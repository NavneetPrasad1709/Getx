import { z } from 'zod';

export const CreateOfferSchema = z.object({
  requestId: z.string().min(1),
  price: z.number().min(1).max(100000),
  currency: z.string().default('USD'),
  deliveryHours: z.number().int().min(1).max(720),
  message: z.string().min(20, 'Pitch too short').max(2000),
});

export type CreateOfferDto = z.infer<typeof CreateOfferSchema>;
