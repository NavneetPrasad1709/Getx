# GETX

> Get X. Get gaming.

Production-grade gaming marketplace built for 20 lakh users.

**Domain:** [getx.gg](https://getx.gg)
**Parent:** Deccanport Technologies Pvt Ltd

## Architecture

Multi-app monorepo (Eldorado-style):

| App           | URL           | Port | Stack                             |
| ------------- | ------------- | ---- | --------------------------------- |
| `apps/web`    | getx.gg       | 3000 | Next.js 14 (buyer)                |
| `apps/seller` | sell.getx.gg  | 3001 | Next.js 14 (seller dashboard)     |
| `apps/admin`  | admin.getx.gg | 3002 | Next.js 14 (admin, IP-restricted) |
| `apps/api`    | api.getx.gg   | 4000 | NestJS (backend)                  |

## Shared Packages

- `@getx/database` — Prisma schema + client
- `@getx/ui` — Shared shadcn/ui components
- `@getx/types` — Shared TypeScript types
- `@getx/games` — Game configs (Pokemon GO, Roblox, ...)
- `@getx/utils` — Shared utilities (FX, order numbers, ...)

## Stack (Locked)

- **Frontend:** Next.js 14 + Tailwind + shadcn/ui + Framer Motion + TanStack Query + Zustand
- **Backend:** NestJS + Prisma + PostgreSQL
- **Cache:** Redis (Upstash)
- **Queue:** BullMQ
- **Realtime:** Socket.io
- **Payments:** Razorpay
- **Email:** Resend
- **Storage:** Cloudflare R2

## Requirements

- Node.js >= 20
- pnpm >= 9

## Development

```bash
pnpm install
pnpm dev
```

Apps:

- Web (buyer): http://localhost:3000
- Seller: http://localhost:3001
- Admin: http://localhost:3002
- API: http://localhost:4000

## Scripts

```bash
pnpm dev          # Run all apps
pnpm build        # Build all apps
pnpm lint         # Lint all
pnpm typecheck    # Type-check all
pnpm test         # Test all
pnpm format       # Format codebase
```

## Status

Bootstrapping in progress — Prompt 1 of 16 (initial monorepo scaffold).
