-- Phase 6 (2026-05-20) — Listing search performance.
--
-- The listings index page uses `where: { OR: [title contains, description
-- contains], mode: 'insensitive' }`. That compiles to `ILIKE '%term%'`,
-- which can't use a normal B-tree index and scans the full
-- ProductListing table. At 1L+ listings the query already takes a
-- noticeable hit; at 20L it becomes the slowest endpoint on the site.
--
-- Fix: install pg_trgm and add GIN indexes with gin_trgm_ops on the
-- two columns the search hits. Postgres will rewrite the ILIKE
-- predicate to use the trigram index. No application change needed.
-- These indexes are NOT reflected in schema.prisma (Prisma's index DSL
-- doesn't model gin_trgm_ops cleanly without a preview feature flag);
-- they live as out-of-band SQL and `prisma migrate diff` will flag a
-- harmless drift report. Acceptable trade-off for v1.

-- Postgres extension — idempotent; safe to re-run.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram index on title — small column, hot on the index page.
CREATE INDEX IF NOT EXISTS "ProductListing_title_trgm_idx"
  ON "ProductListing"
  USING gin ("title" gin_trgm_ops);

-- Trigram index on description — larger column, still worth it because
-- the search filter ORs over both. PostgreSQL will pick whichever index
-- the planner thinks is cheaper per term.
CREATE INDEX IF NOT EXISTS "ProductListing_description_trgm_idx"
  ON "ProductListing"
  USING gin ("description" gin_trgm_ops);
