-- RES-HIGH-012: GIN trigram indexes for CustomRequest free-text search.
--
-- listRequests uses `title ILIKE '%q%' OR description ILIKE '%q%'`.
-- Without trigram indexes this is a full table scan; at 10k+ requests
-- it becomes the slowest endpoint on the reverse-marketplace side.
--
-- Extension is idempotent — already installed by phase6 listing migration.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "CustomRequest_title_trgm_idx"
  ON "CustomRequest"
  USING gin ("title" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "CustomRequest_description_trgm_idx"
  ON "CustomRequest"
  USING gin ("description" gin_trgm_ops);
