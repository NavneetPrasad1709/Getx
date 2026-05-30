import { z } from 'zod';

// RES-MED-050: whitelist currencies to match listing DTO
const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'INR'] as const;

export const CreateOfferSchema = z.object({
  requestId: z.string().min(1),
  price: z.number().min(1).max(100000),
  currency: z.enum(SUPPORTED_CURRENCIES).default('USD'),
  deliveryHours: z.number().int().min(1).max(720),
  message: z.string().min(20, 'Pitch too short').max(2000),
});

export type CreateOfferDto = z.infer<typeof CreateOfferSchema>;
