-- Phase 7 (2026-05-21) — OAuth identity store.
--
-- 1. Make User.password nullable.
--    OAuth-only signups (Google, Discord) don't carry a password.
--    Existing email-password users keep their bcrypt hash unchanged;
--    auth.service.ts checks for null before bcrypt.compare and emits a
--    "use SSO to sign in" hint instead of an Invalid credentials error.
--
-- 2. Create OAuthAccount table.
--    One row per federated identity. A single User may link multiple
--    providers later (e.g. signed up via Google, then connects Discord
--    from /profile/settings/security), so this is a 1-to-many rather
--    than denormalised columns on User. Unique on (provider, providerId)
--    so the same Google account can't be linked twice.

-- 1. Relax NOT NULL on User.password.
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;

-- 2. OAuthAccount table.
CREATE TABLE "OAuthAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "providerEmail" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OAuthAccount_provider_providerId_key"
    ON "OAuthAccount"("provider", "providerId");

CREATE INDEX "OAuthAccount_userId_idx" ON "OAuthAccount"("userId");

ALTER TABLE "OAuthAccount"
    ADD CONSTRAINT "OAuthAccount_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
