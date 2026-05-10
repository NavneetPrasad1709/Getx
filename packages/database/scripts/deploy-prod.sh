#!/bin/bash
# Production database deploy. Run from repo root or packages/database.
# Requires DATABASE_URL (pooled, prod) and DIRECT_URL (non-pooled) in env.

set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ DATABASE_URL not set" >&2
  exit 1
fi
if [ -z "${DIRECT_URL:-}" ]; then
  echo "❌ DIRECT_URL not set (needed by 'prisma migrate deploy')" >&2
  exit 1
fi

echo "🚀 GETX production database deploy"
echo "   Datasource: $(echo "$DATABASE_URL" | sed -E 's#^[a-z]+://[^@]+@([^/]+)/.*$#\1#')"
echo ""

cd "$(dirname "$0")/.."

echo "📦 prisma migrate deploy"
pnpm prisma migrate deploy

echo "🔧 prisma generate"
pnpm prisma generate

echo ""
echo "✅ Database deploy complete"
echo "   Next: pnpm seed:prod  (idempotent — safe to re-run)"
