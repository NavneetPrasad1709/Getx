-- Phase 5 follow-up (2026-05-20). Narrow the PaymentProvider enum to
-- STRIPE only. The multi-provider abstraction (Paddle / Razorpay /
-- PayPal / Crypto) is removed; Stripe handles every currency we accept.
--
-- Withdrawal rails (WithdrawalMethod: UPI / PAYPAL / WISE /
-- BANK_TRANSFER_* / CRYPTO_*) are independent and unchanged.
--
-- Defensive first step: any existing Order rows that captured one of
-- the removed providers (would only happen in dev / staging — there are
-- no live prod orders at the time of this migration) are NULLed out so
-- the enum recast can't fail with an "invalid input value" error.

-- 1. Null out historical rows that referenced removed providers.
UPDATE "Order"
SET "paymentProvider" = NULL
WHERE "paymentProvider" IN ('PADDLE', 'RAZORPAY', 'PAYPAL', 'CRYPTO');

-- 2. Swap the enum type.
BEGIN;
CREATE TYPE "PaymentProvider_new" AS ENUM ('STRIPE');
ALTER TABLE "Order"
  ALTER COLUMN "paymentProvider" TYPE "PaymentProvider_new"
  USING ("paymentProvider"::text::"PaymentProvider_new");
ALTER TYPE "PaymentProvider" RENAME TO "PaymentProvider_old";
ALTER TYPE "PaymentProvider_new" RENAME TO "PaymentProvider";
DROP TYPE "PaymentProvider_old";
COMMIT;
