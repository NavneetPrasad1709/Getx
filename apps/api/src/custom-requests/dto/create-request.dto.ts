import { z } from 'zod';
import { safeImageUrl } from '../../common/validators/safe-url';

/* Buyers no longer set budget or timeline — sellers propose both
   in their offer (price + deliveryHours). Schema still accepts the
   fields for forward-compat (old clients, older app builds), defaults
   them to 0 / 0 so existing DB columns stay populated. The DB columns
   themselves stay NOT NULL until a follow-up migration relaxes them. */
const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD'] as const;

export const CreateRequestSchema = z.object({
  gameSlug: z.string().min(1),
  tabType: z.enum(['ACCOUNTS', 'TOP_UPS', 'ITEMS', 'BOOSTING']),
  subCategory: z.string().optional(),

  title: z.string().min(5, 'Title too short').max(150),
  description: z
    .string()
    .min(20, 'Description must be at least 20 characters')
    .max(2000),

  images: z.array(safeImageUrl()).max(5).default([]),

  /* Currency the buyer wants offers quoted in. Sellers see this and
     bid in the same currency; payout conversion happens at order time. */
  currency: z.enum(SUPPORTED_CURRENCIES).default('USD'),

  /* Legacy fields — buyer form no longer collects them. Defaults to 0
     so the schema validates without buyer input. Sellers can still
     surface a "Suggested budget?" coaching note on the bid form. */
  budgetMin: z.number().min(0).default(0),
  budgetMax: z.number().min(0).default(0),
  deliveryDays: z.number().int().min(0).max(60).default(0),

  attributes: z.record(z.string(), z.unknown()).default({}),
  addons: z.record(z.string(), z.boolean()).optional(),

  platform: z.string().optional(),
});

export type CreateRequestDto = z.infer<typeof CreateRequestSchema>;
