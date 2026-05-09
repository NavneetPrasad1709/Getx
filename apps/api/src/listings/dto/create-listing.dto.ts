import { z } from 'zod';

export const CreateListingSchema = z.object({
  gameSlug: z.string().min(1),
  tabType: z.enum(['ACCOUNTS', 'TOP_UPS', 'ITEMS']),
  productType: z.string().min(1),

  title: z.string().min(5, 'Title too short').max(150),
  description: z.string().min(20, 'Description too short').max(5000),

  price: z.number().min(1, 'Price must be at least $1').max(100000),
  currency: z.string().default('USD'),
  originalPrice: z.number().min(1).optional(),

  stock: z.number().int().min(-1).default(1),

  images: z.array(z.string()).max(10).default([]),
  videoUrl: z.string().url().optional(),

  attributes: z.record(z.string(), z.unknown()).default({}),

  deliveryType: z.enum(['INSTANT', 'MANUAL', 'SERVICE']),
  deliveryTime: z.string().optional(),

  searchTags: z.array(z.string()).max(20).default([]),

  publish: z.boolean().default(true),
});

export const UpdateListingSchema = CreateListingSchema.partial();

export type CreateListingDto = z.infer<typeof CreateListingSchema>;
export type UpdateListingDto = z.infer<typeof UpdateListingSchema>;
