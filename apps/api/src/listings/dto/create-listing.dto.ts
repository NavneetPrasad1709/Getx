import { z } from 'zod';
import { ProductType } from '@getx/database';
import { safeImageUrl, safeHttpUrl } from '../../common/validators/safe-url';

// RES-HIGH-049: whitelist supported currencies — free-text allows emoji/garbage
const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'INR'] as const;

export const CreateListingSchema = z.object({
  gameSlug: z.string().min(1),
  tabType: z.enum(['ACCOUNTS', 'TOP_UPS', 'ITEMS']),
  // DB-025: enum replaces freetext productType
  productType: z.nativeEnum(ProductType),

  title: z.string().min(5, 'Title too short').max(150),
  description: z.string().min(20, 'Description too short').max(5000),

  price: z.number().min(1, 'Price must be at least $1').max(100000),
  currency: z.enum(SUPPORTED_CURRENCIES).default('USD'),
  originalPrice: z.number().min(1).optional(),

  stock: z.number().int().min(-1).default(1),

  // RES-HIGH-001: use safeImageUrl — plain z.string() accepted javascript: and data:text/html
  images: z.array(safeImageUrl()).max(10).default([]),
  videoUrl: safeHttpUrl().optional(),

  attributes: z.record(z.string(), z.unknown()).default({}),

  deliveryType: z.enum(['INSTANT', 'MANUAL', 'SERVICE']),
  deliveryTime: z.string().optional(),

  searchTags: z.array(z.string()).max(20).default([]),

  publish: z.boolean().default(true),
});

export const UpdateListingSchema = CreateListingSchema.partial();

export type CreateListingDto = z.infer<typeof CreateListingSchema>;
export type UpdateListingDto = z.infer<typeof UpdateListingSchema>;
