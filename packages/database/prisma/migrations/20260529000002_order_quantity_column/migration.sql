-- PAY-HIGH-024: promote quantity from paymentMetadata JSON to first-class column
-- Backfills from metadata where present; defaults to 1 for historical rows.
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "quantity" INTEGER NOT NULL DEFAULT 1;

UPDATE "Order"
SET "quantity" = COALESCE(
  ("paymentMetadata" ->> 'quantity')::INTEGER,
  1
)
WHERE ("paymentMetadata" ->> 'quantity') IS NOT NULL
  AND ("paymentMetadata" ->> 'quantity') ~ '^[0-9]+$';
