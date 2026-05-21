# syntax=docker/dockerfile:1.7
FROM node:24-bookworm-slim AS base
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@10.15.0

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
# `pnpm deploy` flattens transitive deps (express via @nestjs/platform-express,
# etc.) into a self-contained /deploy directory so the prod image doesn't
# have to ship the entire pnpm store + workspace symlinks.
RUN pnpm --filter @getx/api --prod --legacy deploy /deploy
# Regenerate the Prisma client inside /deploy. `pnpm deploy` builds a fresh
# node_modules from the pnpm store, which contains only the un-generated
# @prisma/client stub — the client we produced earlier in this stage lives
# in /app/node_modules and never makes it to /deploy. Without this step the
# container starts but crashes the first time `new PrismaClient()` runs,
# which is the very next line after constructor injection finishes — way
# before /api/v1/health can answer.
RUN cd /deploy && /app/node_modules/.bin/prisma generate \
    --schema=/deploy/node_modules/@getx/database/prisma/schema.prisma

FROM base AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /deploy ./
EXPOSE 4000
# Bind the listener to 0.0.0.0 instead of the platform default so the
# Railway edge can reach it. main.ts honors $HOST via process.env if set.
ENV HOST=0.0.0.0
CMD ["node", "dist/main"]
