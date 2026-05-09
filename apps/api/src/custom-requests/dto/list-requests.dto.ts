import { z } from 'zod';

export const ListRequestsSchema = z.object({
  gameSlug: z.string().optional(),
  tabType: z.enum(['ACCOUNTS', 'TOP_UPS', 'ITEMS', 'BOOSTING']).optional(),
  subCategory: z.string().optional(),
  status: z
    .enum(['OPEN', 'AWAITING_CHOICE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
    .optional(),

  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z
    .enum(['newest', 'budget-high', 'budget-low', 'expiring-soon'])
    .default('newest'),

  mine: z.coerce.boolean().optional(),
});

export type ListRequestsDto = z.infer<typeof ListRequestsSchema>;
