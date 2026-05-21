-- Phase 2 audit migration (2026-05-20).
--
-- 1. Recovers the `WebhookEvent` table — added to schema.prisma in commit
--    7bd75a3 ("pre-launch polish + content + provider config") but never
--    migrated. apps/api/src/payments/payments.service.ts:257 inserts into
--    this table during inbound webhook processing, so the prod runtime is
--    currently crashing on the first Stripe/Razorpay/PayPal callback.
--
-- 2. Adds two missing indexes on Order:
--      (escrowStatus, autoReleaseAt) — escrow auto-release cron filter
--      (status, createdAt)            — admin / seller dashboard sort
--    The lone autoReleaseAt index is dropped because the composite covers
--    every query that hit it.
--
-- 3. Flips ON DELETE behaviour on three User-owned tables from CASCADE to
--    RESTRICT so a hard delete on User cannot wipe financial / compliance
--    rows. Soft delete (User.deletedAt) is unaffected.
--      - LoyaltyTransaction.userId  (loyalty ledger)
--      - KycDocument.userId         (compliance evidence)
--      - Referral.referrerId        (reward attribution)
--
-- This migration is purely additive (one new table, two new indexes) plus
-- metadata-only FK switches; no data is rewritten.

-- DropForeignKey
ALTER TABLE "KycDocument" DROP CONSTRAINT "KycDocument_userId_fkey";

-- DropForeignKey
ALTER TABLE "LoyaltyTransaction" DROP CONSTRAINT "LoyaltyTransaction_userId_fkey";

-- DropForeignKey
ALTER TABLE "Referral" DROP CONSTRAINT "Referral_referrerId_fkey";

-- DropIndex
DROP INDEX "Order_autoReleaseAt_idx";

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebhookEvent_createdAt_idx" ON "WebhookEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_provider_externalId_key" ON "WebhookEvent"("provider", "externalId");

-- CreateIndex
CREATE INDEX "Order_escrowStatus_autoReleaseAt_idx" ON "Order"("escrowStatus", "autoReleaseAt");

-- CreateIndex
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "KycDocument" ADD CONSTRAINT "KycDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
