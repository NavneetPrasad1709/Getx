import { z } from 'zod';
import { safeImageUrl } from '../../common/validators/safe-url';

/* Image-only messages are valid — content may be empty when attachments
   exist. The refinement enforces "at least one of content or attachments". */
export const SendMessageSchema = z
  .object({
    conversationId: z.string().min(1),
    content: z.string().max(2000).default(''),
    attachments: z.array(safeImageUrl()).max(4).default([]),
    type: z.enum(['TEXT', 'IMAGE']).default('TEXT'),
  })
  .refine((d) => d.content.trim().length > 0 || d.attachments.length > 0, {
    message: 'Message must include text or at least one attachment',
    path: ['content'],
  })
  // RES-MED-044: IMAGE type must have at least one attachment
  .refine((d) => d.type !== 'IMAGE' || d.attachments.length > 0, {
    message: 'IMAGE type requires at least one attachment',
    path: ['attachments'],
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
