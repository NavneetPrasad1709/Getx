import { z } from 'zod';
import { safeImageUrl } from '../../common/validators/safe-url';

export const CreateReviewSchema = z.object({
  orderId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().min(3).max(150).optional(),
  content: z.string().min(10, 'Review too short').max(2000),
  images: z.array(safeImageUrl()).max(5).default([]),
});

export const RespondToReviewSchema = z.object({
  responseText: z.string().min(5).max(1000),
});

export type CreateReviewDto = z.infer<typeof CreateReviewSchema>;
export type RespondToReviewDto = z.infer<typeof RespondToReviewSchema>;
