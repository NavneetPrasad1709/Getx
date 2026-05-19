import { z } from 'zod';
import { ListListingsSchema } from '../../listings/dto/list-listings.dto';

/* Saved-search filter snapshot — mirrors ListListingsDto but drops the
   pagination/sort cursors so they don't pin the saved query to a single
   page when the cron replays it. */
export const SavedSearchFiltersSchema = ListListingsSchema.omit({
  page: true,
  limit: true,
});
export type SavedSearchFilters = z.infer<typeof SavedSearchFiltersSchema>;

export const CreateSavedSearchSchema = z.object({
  /* Optional user-overridden label — when missing, the service generates
     a human-readable summary from filters. */
  name: z.string().min(1).max(180).optional(),
  filters: SavedSearchFiltersSchema,
  emailAlerts: z.boolean().default(true),
});
export type CreateSavedSearchDto = z.infer<typeof CreateSavedSearchSchema>;

export const UpdateSavedSearchSchema = z
  .object({
    name: z.string().min(1).max(180).optional(),
    emailAlerts: z.boolean().optional(),
  })
  .refine((d) => d.name !== undefined || d.emailAlerts !== undefined, {
    message: 'Provide at least one field to update',
  });
export type UpdateSavedSearchDto = z.infer<typeof UpdateSavedSearchSchema>;
