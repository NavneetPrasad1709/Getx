import { z } from 'zod';

export const ApplyWalletSchema = z.object({
  orderId: z.string().min(1),
  amount: z.coerce.number().positive().finite(),
});
export type ApplyWalletDto = z.infer<typeof ApplyWalletSchema>;

/* Withdraw schemas — one variant per payout rail. discriminatedUnion
   guarantees the right method-specific fields are present without
   leaking them into other payout flows. Per-method minimum amounts
   are enforced in WalletService.withdraw, not here, because they're
   currency-aware. */

const UpiWithdrawSchema = z.object({
  method: z.literal('UPI'),
  amount: z.coerce.number().positive().finite(),
  upiId: z
    .string()
    .min(3)
    .max(100)
    .regex(/^[\w.-]+@[\w.-]+$/i, 'Invalid UPI ID'),
});

const PaypalWithdrawSchema = z.object({
  method: z.literal('PAYPAL'),
  amount: z.coerce.number().positive().finite(),
  paypalEmail: z.string().email(),
});

const WiseWithdrawSchema = z.object({
  method: z.literal('WISE'),
  amount: z.coerce.number().positive().finite(),
  wiseEmail: z.string().email(),
});

const BankWithdrawSchema = z.object({
  method: z.literal('BANK_TRANSFER_INTL'),
  amount: z.coerce.number().positive().finite(),
  holderName: z.string().min(2).max(120),
  iban: z.string().min(15).max(34),
  bic: z.string().min(8).max(11),
  bankName: z.string().min(2).max(120),
});

export const WithdrawSchema = z.discriminatedUnion('method', [
  UpiWithdrawSchema,
  PaypalWithdrawSchema,
  WiseWithdrawSchema,
  BankWithdrawSchema,
]);
export type WithdrawDto = z.infer<typeof WithdrawSchema>;
