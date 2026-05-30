-- RES-HIGH-051: promote dedupeKey from JSON metadata to first-class column.
-- Replaces the expensive JSON-path scan in notifications.service.ts with a
-- unique index lookup.

ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "dedupeKey" VARCHAR(200);

-- Partial unique index: only unique when dedupeKey is set (non-deduped
-- notifications can have multiple rows without a key)
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "Notification_userId_dedupeKey_unique"
  ON "Notification"("userId", "dedupeKey")
  WHERE "dedupeKey" IS NOT NULL;
