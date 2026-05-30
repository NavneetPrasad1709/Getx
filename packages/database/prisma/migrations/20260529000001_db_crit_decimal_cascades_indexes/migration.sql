-- DB CRITICAL + HIGH fixes (2026-05-29)
--
-- DB-CRIT-001..005  Float → Decimal on all money columns
-- DB-CRIT-007       AuditLog.user onDelete: SetNull (preserve audit trail on user delete)
-- DB-CRIT-008       Conversation.order/offer onDelete: Cascade → Restrict (preserve chat evidence)
-- DB-CRIT-009       Order.paymentTransactionId @unique (webhook idempotency)
-- DB-CRIT-010       WalletTransaction.idempotencyKey @unique (prevent double-credit)
-- DB-CRIT-011       Payout.providerTransactionId @unique + idempotencyKey @unique + @@unique([orderId, sellerId])
-- DB-HIGH-012       User: add (deletedAt), (status, xp), (status, rankUpdatedAt) indexes
-- DB-HIGH-013       ProductListing: add covering (gameId, tabType, status, createdAt), (isFeatured, featuredUntil), (deletedAt)
-- DB-HIGH-014       Order: add (buyerId, status, createdAt), (sellerId, status, createdAt), (paymentTransactionId)
-- DB-HIGH-015       Conversation: replace (buyerId, status) + (sellerId, status) with lastMessageAt variants
-- DB-HIGH-018       Offer: add (buyerId, status, createdAt)
-- DB-HIGH-019       Dispute: add (creatorId, status), replace (priority, status) with (priority, status, createdAt)
-- DB-HIGH-020       Withdrawal: replace (userId, status) with (userId, status, requestedAt)
-- DB-MED-033        AuditLog: replace (userId) with (userId, createdAt)
-- DB-MED-042        Game: drop redundant (slug) index (slug is @unique)

-- ─── DB-CRIT-001: User wallet fields ─────────────────────────────────────────
ALTER TABLE "User" ALTER COLUMN "buyerWallet" TYPE DECIMAL(14,2) USING "buyerWallet"::DECIMAL(14,2);
ALTER TABLE "User" ALTER COLUMN "sellerWallet" TYPE DECIMAL(14,2) USING "sellerWallet"::DECIMAL(14,2);
ALTER TABLE "User" ALTER COLUMN "pendingEarnings" TYPE DECIMAL(14,2) USING "pendingEarnings"::DECIMAL(14,2);
ALTER TABLE "User" ALTER COLUMN "totalEarned" TYPE DECIMAL(14,2) USING "totalEarned"::DECIMAL(14,2);
ALTER TABLE "User" ALTER COLUMN "totalSpent" TYPE DECIMAL(14,2) USING "totalSpent"::DECIMAL(14,2);

-- ─── DB-CRIT-002: Order money fields ─────────────────────────────────────────
ALTER TABLE "Order" ALTER COLUMN "amount" TYPE DECIMAL(14,2) USING "amount"::DECIMAL(14,2);
ALTER TABLE "Order" ALTER COLUMN "buyerFee" TYPE DECIMAL(14,2) USING "buyerFee"::DECIMAL(14,2);
ALTER TABLE "Order" ALTER COLUMN "buyerTotal" TYPE DECIMAL(14,2) USING "buyerTotal"::DECIMAL(14,2);
ALTER TABLE "Order" ALTER COLUMN "walletApplied" TYPE DECIMAL(14,2) USING "walletApplied"::DECIMAL(14,2);
ALTER TABLE "Order" ALTER COLUMN "loyaltyUsdApplied" TYPE DECIMAL(14,2) USING "loyaltyUsdApplied"::DECIMAL(14,2);
ALTER TABLE "Order" ALTER COLUMN "taxAmount" TYPE DECIMAL(14,2) USING "taxAmount"::DECIMAL(14,2);
ALTER TABLE "Order" ALTER COLUMN "sellerCommission" TYPE DECIMAL(14,2) USING "sellerCommission"::DECIMAL(14,2);
ALTER TABLE "Order" ALTER COLUMN "sellerAmount" TYPE DECIMAL(14,2) USING "sellerAmount"::DECIMAL(14,2);
ALTER TABLE "Order" ALTER COLUMN "fxRate" TYPE DECIMAL(12,6) USING "fxRate"::DECIMAL(12,6);
ALTER TABLE "Order" ALTER COLUMN "fxMargin" TYPE DECIMAL(12,6) USING "fxMargin"::DECIMAL(12,6);
ALTER TABLE "Order" ALTER COLUMN "sellerAmountInr" TYPE DECIMAL(14,2) USING "sellerAmountInr"::DECIMAL(14,2);
ALTER TABLE "Order" ALTER COLUMN "refundAmount" TYPE DECIMAL(14,2) USING "refundAmount"::DECIMAL(14,2);

-- ─── DB-CRIT-003: WalletTransaction ledger ───────────────────────────────────
ALTER TABLE "WalletTransaction" ALTER COLUMN "amount" TYPE DECIMAL(14,2) USING "amount"::DECIMAL(14,2);
ALTER TABLE "WalletTransaction" ALTER COLUMN "balanceBefore" TYPE DECIMAL(14,2) USING "balanceBefore"::DECIMAL(14,2);
ALTER TABLE "WalletTransaction" ALTER COLUMN "balanceAfter" TYPE DECIMAL(14,2) USING "balanceAfter"::DECIMAL(14,2);

-- ─── DB-CRIT-004: Withdrawal + Payout ───────────────────────────────────────
ALTER TABLE "Withdrawal" ALTER COLUMN "amount" TYPE DECIMAL(14,2) USING "amount"::DECIMAL(14,2);
ALTER TABLE "Withdrawal" ALTER COLUMN "fee" TYPE DECIMAL(14,2) USING "fee"::DECIMAL(14,2);
ALTER TABLE "Withdrawal" ALTER COLUMN "netAmount" TYPE DECIMAL(14,2) USING "netAmount"::DECIMAL(14,2);
ALTER TABLE "Withdrawal" ALTER COLUMN "fxRate" TYPE DECIMAL(12,6) USING "fxRate"::DECIMAL(12,6);
ALTER TABLE "Withdrawal" ALTER COLUMN "amountInr" TYPE DECIMAL(14,2) USING "amountInr"::DECIMAL(14,2);
ALTER TABLE "Withdrawal" ALTER COLUMN "netAmountInr" TYPE DECIMAL(14,2) USING "netAmountInr"::DECIMAL(14,2);
ALTER TABLE "Payout" ALTER COLUMN "amount" TYPE DECIMAL(14,2) USING "amount"::DECIMAL(14,2);
ALTER TABLE "Payout" ALTER COLUMN "currency" SET DEFAULT 'USD';

-- ─── DB-CRIT-005: Listing / Request / Offer / Dispute money fields ────────────
ALTER TABLE "CustomRequest" ALTER COLUMN "budgetMin" TYPE DECIMAL(14,2) USING "budgetMin"::DECIMAL(14,2);
ALTER TABLE "CustomRequest" ALTER COLUMN "budgetMax" TYPE DECIMAL(14,2) USING "budgetMax"::DECIMAL(14,2);
ALTER TABLE "Offer" ALTER COLUMN "price" TYPE DECIMAL(14,2) USING "price"::DECIMAL(14,2);
ALTER TABLE "ProductListing" ALTER COLUMN "price" TYPE DECIMAL(14,2) USING "price"::DECIMAL(14,2);
ALTER TABLE "ProductListing" ALTER COLUMN "originalPrice" TYPE DECIMAL(14,2) USING "originalPrice"::DECIMAL(14,2);
ALTER TABLE "Dispute" ALTER COLUMN "refundAmount" TYPE DECIMAL(14,2) USING "refundAmount"::DECIMAL(14,2);

-- ─── DB-CRIT-007: AuditLog — preserve log when user is deleted ───────────────
ALTER TABLE "AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_userId_fkey";
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── DB-CRIT-008: Conversation — prevent cascade-delete of chat evidence ──────
ALTER TABLE "Conversation" DROP CONSTRAINT "Conversation_orderId_fkey";
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Conversation" DROP CONSTRAINT "Conversation_offerId_fkey";
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_offerId_fkey"
  FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── DB-CRIT-009: Order.paymentTransactionId @unique ─────────────────────────
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "Order_paymentTransactionId_key"
  ON "Order"("paymentTransactionId") WHERE "paymentTransactionId" IS NOT NULL;

-- ─── DB-CRIT-010: WalletTransaction.idempotencyKey ───────────────────────────
ALTER TABLE "WalletTransaction" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "WalletTransaction_idempotencyKey_key"
  ON "WalletTransaction"("idempotencyKey") WHERE "idempotencyKey" IS NOT NULL;

-- ─── DB-CRIT-011: Payout idempotency ─────────────────────────────────────────
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "providerTransactionId" TEXT;
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "Payout_providerTransactionId_key"
  ON "Payout"("providerTransactionId") WHERE "providerTransactionId" IS NOT NULL;
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "Payout_idempotencyKey_key"
  ON "Payout"("idempotencyKey") WHERE "idempotencyKey" IS NOT NULL;
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "Payout_orderId_sellerId_key"
  ON "Payout"("orderId", "sellerId");

-- ─── DB-HIGH-012: User performance indexes ───────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS "User_deletedAt_idx" ON "User"("deletedAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "User_status_xp_idx" ON "User"("status", "xp");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "User_status_rankUpdatedAt_idx" ON "User"("status", "rankUpdatedAt");

-- ─── DB-HIGH-013: ProductListing covering index ───────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ProductListing_gameId_tabType_status_createdAt_idx"
  ON "ProductListing"("gameId", "tabType", "status", "createdAt" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ProductListing_isFeatured_featuredUntil_idx"
  ON "ProductListing"("isFeatured", "featuredUntil");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ProductListing_deletedAt_idx"
  ON "ProductListing"("deletedAt");

-- ─── DB-HIGH-014: Order covering indexes ─────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Order_buyerId_status_createdAt_idx"
  ON "Order"("buyerId", "status", "createdAt" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Order_sellerId_status_createdAt_idx"
  ON "Order"("sellerId", "status", "createdAt" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Order_paymentTransactionId_idx"
  ON "Order"("paymentTransactionId");

-- ─── DB-HIGH-015: Conversation inbox indexes ─────────────────────────────────
DROP INDEX CONCURRENTLY IF EXISTS "Conversation_buyerId_status_idx";
DROP INDEX CONCURRENTLY IF EXISTS "Conversation_sellerId_status_idx";
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Conversation_buyerId_status_lastMessageAt_idx"
  ON "Conversation"("buyerId", "status", "lastMessageAt" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Conversation_sellerId_status_lastMessageAt_idx"
  ON "Conversation"("sellerId", "status", "lastMessageAt" DESC);

-- ─── DB-HIGH-018: Offer buyer index ──────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Offer_buyerId_status_createdAt_idx"
  ON "Offer"("buyerId", "status", "createdAt" DESC);

-- ─── DB-HIGH-019: Dispute queue indexes ──────────────────────────────────────
DROP INDEX CONCURRENTLY IF EXISTS "Dispute_priority_status_idx";
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Dispute_priority_status_createdAt_idx"
  ON "Dispute"("priority", "status", "createdAt" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Dispute_creatorId_status_idx"
  ON "Dispute"("creatorId", "status");

-- ─── DB-HIGH-020: Withdrawal user index ──────────────────────────────────────
DROP INDEX CONCURRENTLY IF EXISTS "Withdrawal_userId_status_idx";
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Withdrawal_userId_status_requestedAt_idx"
  ON "Withdrawal"("userId", "status", "requestedAt" DESC);

-- ─── DB-MED-033: AuditLog composite ──────────────────────────────────────────
DROP INDEX CONCURRENTLY IF EXISTS "AuditLog_userId_idx";
CREATE INDEX CONCURRENTLY IF NOT EXISTS "AuditLog_userId_createdAt_idx"
  ON "AuditLog"("userId", "createdAt" DESC);

-- ─── DB-MED-042: Game slug — redundant (already @unique) ─────────────────────
DROP INDEX CONCURRENTLY IF EXISTS "Game_slug_idx";
