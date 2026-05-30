-- DB HIGH-021..032: schema enums, *By FK columns, PII split, cursor pagination
-- ============================================================

-- ── DB-021: KycProvider enum ──────────────────────────────────
CREATE TYPE "KycProvider" AS ENUM ('SUMSUB', 'DIGIO', 'MANUAL');

ALTER TABLE "User"
  ALTER COLUMN "kycProvider" TYPE "KycProvider"
  USING CASE "kycProvider"
    WHEN 'sumsub' THEN 'SUMSUB'::"KycProvider"
    WHEN 'digio'  THEN 'DIGIO'::"KycProvider"
    WHEN 'manual' THEN 'MANUAL'::"KycProvider"
    ELSE NULL
  END;

-- ── DB-022: OrderPaymentMethod enum ──────────────────────────
CREATE TYPE "OrderPaymentMethod" AS ENUM ('CARD', 'UPI', 'PAYPAL', 'CRYPTO', 'WALLET');

ALTER TABLE "Order"
  ALTER COLUMN "paymentMethod" TYPE "OrderPaymentMethod"
  USING CASE "paymentMethod"
    WHEN 'card'   THEN 'CARD'::"OrderPaymentMethod"
    WHEN 'upi'    THEN 'UPI'::"OrderPaymentMethod"
    WHEN 'paypal' THEN 'PAYPAL'::"OrderPaymentMethod"
    WHEN 'crypto' THEN 'CRYPTO'::"OrderPaymentMethod"
    WHEN 'wallet' THEN 'WALLET'::"OrderPaymentMethod"
    ELSE NULL
  END;

-- ── DB-023: Platform enum ─────────────────────────────────────
CREATE TYPE "Platform" AS ENUM ('IOS', 'ANDROID', 'PC', 'WEB');

ALTER TABLE "CustomRequest"
  ALTER COLUMN "platform" TYPE "Platform"
  USING CASE "platform"
    WHEN 'iOS'     THEN 'IOS'::"Platform"
    WHEN 'Android' THEN 'ANDROID'::"Platform"
    WHEN 'PC'      THEN 'PC'::"Platform"
    WHEN 'Web'     THEN 'WEB'::"Platform"
    ELSE NULL
  END;

-- ── DB-024: AuditSource enum ──────────────────────────────────
CREATE TYPE "AuditSource" AS ENUM ('WEB', 'API', 'ADMIN', 'SYSTEM');

ALTER TABLE "AuditLog"
  ALTER COLUMN "source" TYPE "AuditSource"
  USING UPPER("source")::"AuditSource";

-- ── DB-025: ProductType enum ──────────────────────────────────
CREATE TYPE "ProductType" AS ENUM ('POKECOINS', 'ITEMS_BUNDLE', 'ACCOUNT', 'SERVICE', 'TOP_UP', 'OTHER');

ALTER TABLE "ProductListing"
  ALTER COLUMN "productType" TYPE "ProductType"
  USING CASE "productType"
    WHEN 'pokecoins'    THEN 'POKECOINS'::"ProductType"
    WHEN 'items-bundle' THEN 'ITEMS_BUNDLE'::"ProductType"
    WHEN 'account'      THEN 'ACCOUNT'::"ProductType"
    WHEN 'service'      THEN 'SERVICE'::"ProductType"
    WHEN 'top-up'       THEN 'TOP_UP'::"ProductType"
    ELSE 'OTHER'::"ProductType"
  END;

-- ── DB-026: FxProvider enum ───────────────────────────────────
CREATE TYPE "FxProvider" AS ENUM ('WISE', 'RAZORPAYX', 'MANUAL');

ALTER TABLE "Withdrawal"
  ALTER COLUMN "fxProvider" TYPE "FxProvider"
  USING CASE "fxProvider"
    WHEN 'wise'      THEN 'WISE'::"FxProvider"
    WHEN 'razorpayx' THEN 'RAZORPAYX'::"FxProvider"
    WHEN 'manual'    THEN 'MANUAL'::"FxProvider"
    ELSE NULL
  END;

-- ── DB-027: User.bannedBy → bannedById (self-FK) ──────────────
ALTER TABLE "User" RENAME COLUMN "bannedBy" TO "bannedById";

-- Validate existing values reference real user IDs (data-integrity check)
-- The FK constraint allows NULL and uses SET NULL on admin user deletion.
ALTER TABLE "User"
  ADD CONSTRAINT "User_bannedById_fkey"
  FOREIGN KEY ("bannedById") REFERENCES "User"("id") ON DELETE SET NULL;

-- ── DB-028: KycDocument.reviewedBy → reviewedById (admin FK) ──
ALTER TABLE "KycDocument" RENAME COLUMN "reviewedBy" TO "reviewedById";

ALTER TABLE "KycDocument"
  ADD CONSTRAINT "KycDocument_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL;

-- ── DB-029: Withdrawal.reviewedBy → reviewedById (admin FK) ───
ALTER TABLE "Withdrawal" RENAME COLUMN "reviewedBy" TO "reviewedById";

ALTER TABLE "Withdrawal"
  ADD CONSTRAINT "Withdrawal_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL;

-- ── DB-030: Dispute.resolvedBy → resolvedById (admin FK) ──────
ALTER TABLE "Dispute" RENAME COLUMN "resolvedBy" TO "resolvedById";

ALTER TABLE "Dispute"
  ADD CONSTRAINT "Dispute_resolvedById_fkey"
  FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL;

-- ── DB-031 (a): Order.cancelledBy → cancelledById (user FK) ───
ALTER TABLE "Order" RENAME COLUMN "cancelledBy" TO "cancelledById";

ALTER TABLE "Order"
  ADD CONSTRAINT "Order_cancelledById_fkey"
  FOREIGN KEY ("cancelledById") REFERENCES "User"("id") ON DELETE SET NULL;

-- ── DB-031 (b): UserPii table — PII split ─────────────────────
-- Moves sensitive payout rails + 2FA secret out of the User row so
-- they can be governed independently (retention, encryption scope, RLS).
CREATE TABLE "UserPii" (
  "id"                   TEXT NOT NULL,
  "userId"               TEXT NOT NULL,
  "upiId"                TEXT,
  "bankAccountEncrypted" TEXT,
  "paypalEmail"          TEXT,
  "wiseEmail"            TEXT,
  "twoFactorSecret"      TEXT,
  "updatedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserPii_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UserPii_userId_key" UNIQUE ("userId"),
  CONSTRAINT "UserPii_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Migrate existing non-null payout data from User into UserPii rows.
-- Rows are only created where at least one field is non-null to keep
-- the table sparse (most users have no payout rails configured yet).
INSERT INTO "UserPii" ("id", "userId", "upiId", "bankAccountEncrypted", "paypalEmail", "wiseEmail", "twoFactorSecret", "updatedAt")
SELECT
  gen_random_uuid()::text,
  "id",
  "upiId",
  "bankAccountEncrypted",
  "paypalEmail",
  "wiseEmail",
  "twoFactorSecret",
  NOW()
FROM "User"
WHERE "upiId" IS NOT NULL
   OR "bankAccountEncrypted" IS NOT NULL
   OR "paypalEmail" IS NOT NULL
   OR "wiseEmail" IS NOT NULL
   OR "twoFactorSecret" IS NOT NULL;

-- Drop migrated columns from User
ALTER TABLE "User"
  DROP COLUMN IF EXISTS "upiId",
  DROP COLUMN IF EXISTS "bankAccountEncrypted",
  DROP COLUMN IF EXISTS "paypalEmail",
  DROP COLUMN IF EXISTS "wiseEmail",
  DROP COLUMN IF EXISTS "twoFactorSecret";

-- ── DB-032: cursor pagination index for ProductListing ─────────
-- Supports: WHERE sellerId = $1 AND deletedAt IS NULL ORDER BY createdAt DESC, id DESC
CREATE INDEX "ProductListing_sellerId_deletedAt_createdAt_id_idx"
  ON "ProductListing" ("sellerId", "deletedAt", "createdAt" DESC, "id" DESC);
