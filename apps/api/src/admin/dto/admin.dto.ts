import { z } from 'zod';

export const ListUsersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().max(100).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED']).optional(),
  role: z.enum(['BUYER', 'SELLER', 'BOTH', 'ADMIN', 'SUPER_ADMIN']).optional(),
  isSeller: z.coerce.boolean().optional(),
});

export const UserActionSchema = z.object({
  reason: z.string().min(5).max(500),
});

export const RefundOrderSchema = z.object({
  reason: z.string().min(5).max(500),
  fullRefund: z.coerce.boolean().default(true),
  amount: z.coerce.number().min(0.01).optional(),
});

export const HideContentSchema = z.object({
  reason: z.string().min(5).max(500),
});

export const ListAuditLogsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  userId: z.string().optional(),
  action: z.string().optional(),
  // Match the actual AuditSeverity enum (DEBUG/INFO/WARNING/ERROR/CRITICAL),
  // not the prompt's LOW/MEDIUM/HIGH/CRITICAL.
  severity: z
    .enum(['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'])
    .optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const ListOrdersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  status: z
    .enum([
      'PENDING',
      'PAID',
      'IN_PROGRESS',
      'DELIVERED',
      'CONFIRMED',
      'COMPLETED',
      'CANCELLED',
      'DISPUTED',
      'REFUNDED',
    ])
    .optional(),
});

export const ListListingsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  status: z
    .enum([
      'DRAFT',
      'PENDING_REVIEW',
      'ACTIVE',
      'PAUSED',
      'SOLD_OUT',
      'REMOVED',
      'REJECTED',
    ])
    .optional(),
});

export const ListReviewsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  hidden: z.coerce.boolean().default(false),
});

export type ListUsersDto = z.infer<typeof ListUsersSchema>;
export type UserActionDto = z.infer<typeof UserActionSchema>;
export type RefundOrderDto = z.infer<typeof RefundOrderSchema>;
export type HideContentDto = z.infer<typeof HideContentSchema>;
export type ListAuditLogsDto = z.infer<typeof ListAuditLogsSchema>;
export type ListOrdersDto = z.infer<typeof ListOrdersSchema>;
export type ListListingsDto = z.infer<typeof ListListingsSchema>;
export type ListReviewsDto = z.infer<typeof ListReviewsSchema>;
