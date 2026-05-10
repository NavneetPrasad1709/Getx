import { z } from 'zod';
import { safeImageUrl } from '../../common/validators/safe-url';

export const SendMessageSchema = z.object({
  conversationId: z.string().min(1),
  content: z.string().min(1, 'Message cannot be empty').max(2000),
  attachments: z.array(safeImageUrl()).max(5).default([]),
  type: z.enum(['TEXT', 'IMAGE']).default('TEXT'),
});

export const StartConversationSchema = z
  .object({
    orderId: z.string().optional(),
    offerId: z.string().optional(),
  })
  .refine((d) => !!d.orderId !== !!d.offerId, {
    message: 'Provide exactly one of orderId or offerId',
  });

export const ListMessagesSchema = z.object({
  conversationId: z.string().min(1),
  before: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(30),
});

export type SendMessageDto = z.infer<typeof SendMessageSchema>;
export type StartConversationDto = z.infer<typeof StartConversationSchema>;
export type ListMessagesDto = z.infer<typeof ListMessagesSchema>;
