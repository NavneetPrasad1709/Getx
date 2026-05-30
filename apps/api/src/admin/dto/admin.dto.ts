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
  // RES-HIGH-035: bounded + regex-validated to prevent SCAN amplification
  userId: z.string().regex(/^[a-z0-9_-]{1,40}$/i).optional(),
  action: z.string().max(100).regex(/^[a-zA-Z0-9._:-]+$/).optional(),
  severity: z
    .enum(['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'])
    .optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
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

// PAY-HIGH-013: dispute resolution
export const ResolveDisputeSchema = z.object({
  resolution: z.enum(['REFUND_BUYER', 'RELEASE_TO_SELLER', 'PARTIAL_REFUND', 'NO_ACTION']),
  notes: z.string().min(10).max(2000),
  refundAmount: z.coerce.number().min(0).optional(),
});

// PAY-HIGH-015: withdrawal state machine
export const WithdrawalActionSchema = z.object({
  notes: z.string().max(500).optional(),
});
export const RejectWithdrawalSchema = z.object({
  reason: z.string().min(5).max(500),
});

export type ListUsersDto = z.infer<typeof ListUsersSchema>;
export type UserActionDto = z.infer<typeof UserActionSchema>;
export type RefundOrderDto = z.infer<typeof RefundOrderSchema>;
export type HideContentDto = z.infer<typeof HideContentSchema>;
export type ListAuditLogsDto = z.infer<typeof ListAuditLogsSchema>;
export type ListOrdersDto = z.infer<typeof ListOrdersSchema>;
export type ListListingsDto = z.infer<typeof ListListingsSchema>;
export type ListReviewsDto = z.infer<typeof ListReviewsSchema>;
export type ResolveDisputeDto = z.infer<typeof ResolveDisputeSchema>;
export type WithdrawalActionDto = z.infer<typeof WithdrawalActionSchema>;
export type RejectWithdrawalDto = z.infer<typeof RejectWithdrawalSchema>;
