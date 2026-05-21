import { z } from 'zod';

/* Plain object schema — exported so derived schemas (saved-search filters)
   can `.omit()` from it. Zod v4 forbids .omit() on a refined schema, so the
   base must stay unwrapped. */
export const ListListingsBaseSchema = z.object({
    gameSlug: z.string().optional(),
    tabType: z.enum(['ACCOUNTS', 'TOP_UPS', 'ITEMS']).optional(),
    /* Public seller-storefront filter — narrows listings to one seller's
       ACTIVE inventory. Used by /users/[username] listings tab. */
    sellerId: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(24),
    sort: z
      .enum(['newest', 'price-asc', 'price-desc', 'rating-desc', 'popular'])
      .default('newest'),

    priceMin: z.coerce.number().min(0).optional(),
    priceMax: z.coerce.number().min(0).optional(),
    search: z.string().max(100).optional(),

    // Account-specific filters (only applied when tabType=ACCOUNTS).
    levelMin: z.coerce.number().int().min(1).max(80).optional(),
    levelMax: z.coerce.number().int().min(1).max(80).optional(),
    team: z.string().optional(), // CSV: "Mystic,Valor"
    shinyMin: z.coerce.number().int().min(0).optional(),
    legendaryMin: z.coerce.number().int().min(0).optional(),
    hundoMin: z.coerce.number().int().min(0).optional(),
    region: z.string().optional(),
    platform: z.string().optional(),

    // Top-Ups-specific filters (only applied when tabType=TOP_UPS).
    coinAmount: z.string().optional(),
    deliveryMethod: z.string().optional(),

    // Items-specific filters (only applied when tabType=ITEMS).
    itemTypes: z.string().optional(), // CSV: "Pokeballs,Berries"
    quantityMin: z.coerce.number().int().min(0).optional(),
  });

export const ListListingsSchema = ListListingsBaseSchema
  /* Range sanity — reject inverted bounds at the boundary instead of
     silently returning empty results. Same idea for level range. */
  .refine(
    (v) =>
      v.priceMin === undefined ||
      v.priceMax === undefined ||
      v.priceMin <= v.priceMax,
    { path: ['priceMin'], message: 'priceMin must be ≤ priceMax' },
  )
  .refine(
    (v) =>
      v.levelMin === undefined ||
      v.levelMax === undefined ||
      v.levelMin <= v.levelMax,
    { path: ['levelMin'], message: 'levelMin must be ≤ levelMax' },
  );

export type ListListingsDto = z.infer<typeof ListListingsSchema>;
