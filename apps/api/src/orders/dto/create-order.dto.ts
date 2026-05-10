import { z } from 'zod';
import { safeImageUrl } from '../../common/validators/safe-url';

export const CreateOrderFromListingSchema = z.object({
  listingId: z.string().min(1),
  quantity: z.number().int().min(1).max(100).default(1),
});

export const CreateOrderFromOfferSchema = z.object({
  offerId: z.string().min(1),
});

export const MarkDeliveredSchema = z.object({
  proofImages: z.array(safeImageUrl()).max(5).default([]),
  notes: z.string().max(2000).optional(),
  credentials: z
    .object({
      username: z.string(),
      password: z.string(),
      extra: z.string().optional(),
    })
    .optional(),
});

export type CreateOrderFromListingDto = z.infer<
  typeof CreateOrderFromListingSchema
>;
export type CreateOrderFromOfferDto = z.infer<
  typeof CreateOrderFromOfferSchema
>;
export type MarkDeliveredDto = z.infer<typeof MarkDeliveredSchema>;
