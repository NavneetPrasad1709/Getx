# syntax=docker/dockerfile:1.7
FROM node:24-bookworm-slim AS base
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
# Pin pnpm to the repo's `packageManager` (root package.json) via corepack so
# the Docker build can't drift from local/CI (was hardcoded pnpm@10.15.0).
RUN corepack enable && corepack prepare pnpm@11.0.8 --activate

# Install ALL workspace deps (including transitive) so the build stage
# can compile @getx/api and its workspace siblings.
FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/games/package.json ./packages/games/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY packages/ui/package.json ./packages/ui/
RUN pnpm install --frozen-lockfile --ignore-scripts

FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules
COPY . .
RUN pnpm --filter @getx/database db:generate
# Compile workspace packages to JS before building the API. The API's
# `dist/main.js` issues `require('@getx/database')` at runtime; without
# pre-built JS, Node would try to load `src/index.ts` and crash with a
# `Cannot use import statement outside a module` SyntaxError.
RUN pnpm --filter @getx/types build
RUN pnpm --filter @getx/utils build
RUN pnpm --filter @getx/games build
RUN pnpm --filter @getx/database build
RUN pnpm --filter @getx/api build

FROM base AS prod
# Ship the full built workspace (api + workspace deps + their node_modules
# including the Prisma-generated client) rather than relying on `pnpm deploy`
# to flatten everything. The flatten strategy kept losing the generated
# Prisma client because `pnpm deploy` rebuilds node_modules from the store
# with no postinstall hooks, and reconstructing it in /deploy added paths
# that were brittle across the pnpm symlink store. Larger image, but the
# container has every file it needs at the exact paths the build produced.
WORKDIR /app
ENV NODE_ENV=production
# Bind the listener to 0.0.0.0 instead of the platform default so the
# Railway edge can reach it. main.ts honors $HOST via process.env if set.
ENV HOST=0.0.0.0
# NOTE: non-root user (INFRA-02) temporarily reverted — it was a suspect for the
# container failing to start on Railway. Re-introduce once the deploy is stable
# and verified (Prisma query-engine + any runtime write paths readable/owned by
# the non-root user).
COPY --from=build /app /app
EXPOSE 4000
WORKDIR /app/apps/api
CMD ["node", "dist/main"]
