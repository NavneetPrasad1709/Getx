import { z } from 'zod';

/* Apply loyalty points to a pending order. Points must be > 0 and the
   order must be PENDING and owned by the caller; checks live in the
   service so we can also enforce mutex with the cash wallet. */
export const ApplyLoyaltySchema = z.object({
  orderId: z.string().min(1),
  points: z.coerce.number().int().positive(),
});
export type ApplyLoyaltyDto = z.infer<typeof ApplyLoyaltySchema>;

/* Preview redeem at checkout — does not write. Returns capped points
   and USD value so the order page can render the toggle copy without
   committing the redemption. */
export const PreviewLoyaltySchema = z.object({
  orderId: z.string().min(1),
});
export type PreviewLoyaltyDto = z.infer<typeof PreviewLoyaltySchema>;
