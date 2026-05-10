import { z } from 'zod';
import { safeImageUrl } from '../../common/validators/safe-url';

export const CreateRequestSchema = z
  .object({
    gameSlug: z.string().min(1),
    tabType: z.enum(['ACCOUNTS', 'TOP_UPS', 'ITEMS', 'BOOSTING']),
    subCategory: z.string().optional(),

    title: z.string().min(5, 'Title too short').max(150),
    description: z
      .string()
      .min(20, 'Description must be at least 20 characters')
      .max(2000),

    images: z.array(safeImageUrl()).max(5).default([]),

    budgetMin: z.number().min(1, 'Minimum budget required'),
    budgetMax: z.number().min(1, 'Maximum budget required'),
    currency: z.string().default('USD'),

    attributes: z.record(z.string(), z.unknown()).default({}),
    addons: z.record(z.string(), z.boolean()).optional(),

    deliveryDays: z.number().int().min(1).max(60).default(7),

    platform: z.string().optional(),
  })
  .refine((data) => data.budgetMax >= data.budgetMin, {
    message: 'Maximum budget must be greater than or equal to minimum',
    path: ['budgetMax'],
  });

export type CreateRequestDto = z.infer<typeof CreateRequestSchema>;
