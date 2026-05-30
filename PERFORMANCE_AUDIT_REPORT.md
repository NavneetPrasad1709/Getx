# GETX Marketplace — Performance & Scalability Audit

**Scope:** Backend (NestJS/Prisma/Postgres/Redis), Frontends (Next.js 15 web/seller/admin), Infrastructure (Railway/Vercel/Neon). Read-only static audit. Repo root `d:\GetX_`.

**Verdict:** The codebase is, for a v1 marketplace, **above-average on query hygiene**. Hot read paths use narrow `select` projections, list endpoints are paginated, composite covering indexes exist for the main filter/sort axes, GIN trigram indexes back the `ILIKE` searches, and the Socket.IO layer already ships a Redis adapter for cross-replica fan-out. The N+1 hotspots that usually plague this kind of app (per-row seller/game lookups, unread-count recomputation) are avoided via Prisma `include`/`select` and denormalized counters.

The scalability ceiling is **not query shape — it is shared infrastructure state**. The rate limiter, the Prisma connection pool sizing, and the per-request auth DB hit are the three things that will cap throughput once you run more than one API replica or push real concurrency. Several list endpoints are also capped at `take: 100` with **no real pagination**, which is a silent correctness problem (seller dashboards under-count) rather than a slowness problem.

---

## Scorecard

| Dimension | Score | One-line rationale |
|---|---:|---|
| Frontend | 82 | Good code-splitting, `next/image` everywhere, no raw `<img>`, lazy below-fold; minor: 3 apps re-implement SPA fetching, `transpilePackages` includes `@getx/database`. |
| Backend | 74 | Clean queries & projections; but per-request auth DB read, in-memory throttler, and `take:100`-without-cursor caps are real ceilings. |
| Database | 80 | Strong composite + trigram indexes, Decimal money, idempotency keys; gaps: JSON-path attribute filters unindexed, `OFFSET` pagination, no FK on hot ledger columns. |
| Scalability | 62 | Redis adapter for WS is the bright spot; throttler + lastSeen fallback are per-process, pool=10 vs Neon pooler needs sizing, crons single-replica unguarded. |

---

## Backend

### Query shape & N+1 — mostly clean
Verified the heavy read services. They are well-built:
- `listings.service.ts` `listListings` (L370–379) runs `findMany` + `count` in `Promise.all`, narrow `LIST_SELECT`, paginated. Sellers/games are joined via `select`, not per-row queries.
- `conversations.service.ts` `listMyConversations` (L290–300) uses denormalized `buyerUnread`/`sellerUnread` counters — no per-conversation unread aggregation N+1.
- `notifications.service.ts` `create` (L95–112) joins the user **at create time** so `deliverEmail` needs no second query (comment at L136 confirms this was a deliberate N+1 fix).
- `referrals.service.ts` `getLeaderboard` (L62–83) does `groupBy` then **one** batched `findMany(where: id in [...])` — the correct anti-N+1 pattern.

No loops issuing per-row Prisma calls were found in the read paths. The only per-row loops (`orders.service.ts` `sweepExpiredEscrow` L712, `account-anonymize.cron.ts` L59, `saved-searches.service.ts` `runAlerts` L150) are **bounded batch jobs** (500/500/chunked-200) with per-row try/catch — appropriate for crons.

### The real ceilings

**1. Auth does a full DB read on every authenticated request.** `jwt.strategy.ts` `validate` (L72–87) issues `prisma.user.findUnique` for **every** request hitting a guarded route, selecting 11 columns. There is no cache. At sustained RPS this is your highest-frequency query and it serializes against the 10-connection pool. See PERF-002.

**2. Rate limiter is in-memory.** `app.module.ts:53` `ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }])` uses the default in-process store (comment L48–52 acknowledges it). With N replicas behind a load balancer the effective limit becomes `60 × N` per IP and is unenforceable globally. See PERF-001.

**3. `lastSeen` throttle and socket map fall back to per-process state.** `jwt.strategy.ts:22` `lastSeenFallbackMap` and `chat.gateway.ts:76` `userSockets` are per-replica. The lastSeen path is Redis-gated when `REDIS_URL` is set (good), but if Redis is absent every replica independently writes `lastSeenAt` → write amplification. See PERF-007.

**4. Pagination is `take: 100` with no cursor on several user-facing lists.** `orders.service.ts` `listMyOrders` (L685 `take: 100`, comment admits "until proper pagination ships"), `conversations.listMyConversations` (L297), `custom-requests.getMyRequests` (L336), `wallet.getMyWallet` ledger (L69), `offers.getMyOffers` (L220). These don't crash but: (a) a heavy seller's dashboard silently computes stats over only 100 orders (`apps/seller/src/app/page.tsx` `deriveStats`), and (b) there is no way to reach order #101+. See PERF-005.

### Connection pool sizing (commit `bb9e06a`, 1→10)
The fix itself is correct: `prisma.service.ts:20` now pins `datasources.db.url` to `process.env.DATABASE_URL` so the runtime value wins over the import-time `.env`. Raising `connection_limit=1→10` was necessary — `1` guaranteed pool-exhaustion serialization. **However**, the dashboard endpoint (`admin-dashboard.service.ts` `getDashboard`) fires ~15 `count`/`aggregate` queries; it batches them into `Promise.all` groups of 2–3 (comment L35 "respect connection-pool limits"), which means with pool=10 a **single** admin dashboard load can momentarily consume most of the pool, starving concurrent buyer auth reads. Sizing of 10 against a Neon pooler with `pool_timeout=20` is a guess that needs load validation, not a static guarantee. See PERF-003.

### Heavy admin aggregations (no caching)
`admin-dashboard.service.ts` `getDashboard` recomputes GMV (`order.aggregate _sum buyerTotal`), revenue, pending payouts (`user.aggregate _sum sellerWallet` — **full-table scan, no WHERE**, L63), and counts on **every** call. The admin UI polls this on a `refetchInterval: 60_000` (`use-admin.ts:97`) plus `alerts-counts` every 30s (`use-admin.ts:174`). On a large dataset these `_sum` aggregates over the whole `Order`/`User` tables become the slowest queries on the platform and run unconditionally every minute per open admin tab. No Redis/in-memory memoization. See PERF-004.

### Redis is under-used
`redis.factory.ts` provides a singleton ioredis client, but grep shows it's wired into only the Socket.IO adapter (`chat.gateway.ts`) and the `lastSeen` SETNX gate (`jwt.strategy.ts`). It is **not** used for: hot reads (games list, listing detail, leaderboard — all immutable-ish), the throttler store, or session/auth caching. The infrastructure to cache exists and is unused. See PERF-006.

---

## Database

**Strengths (verified against `schema.prisma` index list):**
- Composite covering indexes match the dominant query plans: `ProductListing(gameId,tabType,status,createdAt)` L743, `Order(buyerId/sellerId,status,createdAt)` L895–896, `Conversation(buyerId/sellerId,status,lastMessageAt)` L981–982, `User(status,xp)` L221 (leaderboard).
- Cursor index `ProductListing(sellerId,deletedAt,createdAt,id)` L752 backs the cursor pagination in `getMyListings` (L706) — the one endpoint that **does** use keyset pagination correctly.
- GIN trigram indexes (`20260520160000`, `20260529000005`) correctly back the `ILIKE '%q%'` searches in `listListings`/`listRequests`. The migration comments show genuine understanding of why a B-tree can't serve `contains`.
- `escrowStatus,autoReleaseAt` index L893 backs the auto-release cron sweep precisely.

**Gaps:**

**1. JSON-path attribute filters are unindexed.** `listings.service.ts` L205–350 builds `where.AND` of `attributes` JSON-path predicates (`path:['level'] gte`, `path:['shinyCount'] gte`, `path:['team'] equals`, `array_contains`). Postgres cannot use a B-tree or the trigram GIN for `jsonb` path comparisons; these become per-row jsonb extraction across the result set after the `gameId,tabType,status` index narrows it. On the ACCOUNTS tab (the primary commerce surface) every level/shiny/legendary filter is a sequential jsonb evaluation. No `gin (attributes jsonb_path_ops)` index exists. See PERF-008.

**2. `OFFSET` pagination on the public browse grid.** `listListings` (L368 `skip = (page-1)*limit`) uses `skip`/`take`. `OFFSET` is O(offset) — deep pages on a popular game scan and discard all preceding rows. The codebase already proved it knows keyset pagination (`getMyListings`), but the highest-traffic endpoint still uses offset. See PERF-009.

**3. Ledger/financial join columns have no FK and some no index.** Per the data-model map: `WalletTransaction.orderId/withdrawalId/refundId`, `Payout.sellerId`, `LoyaltyTransaction.orderId` are plain strings. `WalletTransaction` indexes `orderId`/`withdrawalId` (L1114–1115) but `Favorite` relations are entirely unconstrained (L1496–1499 unique but bare strings). Not a hot-path slowness today, but reconciliation/admin queries that join these will table-scan. (Info — correctness/scale-of-reporting.)

---

## Frontend

**Strengths:**
- `next/image` used in 34 places, **zero raw `<img>`** found. `formats: ['image/avif','image/webp']` set on all three apps. Web hero uses `ReactDOM.preload` with a correct `imageSrcSet` for LCP (`app/page.tsx` L78–90) — genuinely advanced.
- Code splitting is real: landing below-fold sections are `next/dynamic` (`app/page.tsx` L17–31), `react-confetti` and the custom cursor are `dynamic(..., { ssr:false })` (`payment-reward-modal.tsx:22`, `custom-cursor-loader.tsx:7`). GSAP (heavy) is statically imported **only** in `how-it-works/page.tsx` — a low-traffic marketing route, so it doesn't bloat the landing or commerce bundles.
- TanStack Query is configured sanely: `staleTime 60s`, `retry 1`, `refetchOnWindowFocus:false` (`query-provider.tsx`) — avoids the refetch storm on tab focus.
- `optimizePackageImports: ['lucide-react']` (web) / `['@getx/ui']` (seller) tree-shakes icon/UI barrels.

**Issues:**

**1. `@getx/database` is in `transpilePackages` for all three frontends** (`web/next.config.mjs:12`, seller, admin). This package re-exports the Prisma client. It's currently only imported in one **server** route handler (`apps/web/src/app/api/health/db/route.ts`) so it isn't in the client bundle today — but the configuration invites accidental client-side import of Prisma (and its `@prisma/client` engine references), which would explode bundle size and break the build. It's a latent footgun. See PERF-010.

**2. Three apps are near-100% client-rendered SPAs.** 43 of 78 `app/` tsx files carry `'use client'`; the commerce browse pages (`games/pokemon-go/accounts/page.tsx` etc.) are fully client-side and fetch via axios on mount. This means: no server-rendered product data → blank-then-hydrate, an extra client round-trip waterfall (`AuthProvider` session fetch → then page data), and SEO/LCP that depends on JS. For a marketplace, the browse grids are the pages that most benefit from RSC/streaming and are the ones left client-only. See PERF-011.

**3. Auth bootstrap waterfall.** Each app's `AuthProvider` (`use-auth.tsx`) fetches `/auth/session` before authed pages fetch their data, and the axios interceptor adds a refresh round-trip on 401. On a cold load the sequence is session → (maybe refresh) → page query. Acceptable, but it's a serial waterfall on every entry. (Info.)

---

## Infrastructure & Scalability

| Area | State | Note |
|---|---|---|
| WebSocket horizontal scale | **Ready** | `chat.gateway.ts:86–102` installs `@socket.io/redis-adapter` when `REDIS_URL` set; `server.to()` fan-out is cross-replica. Logs a clear warning in single-replica mode. This is the best-architected scaling story in the repo. |
| Rate limiter | **Blocker** | In-memory (PERF-001). |
| Crons | **Blocker for multi-replica** | `@Cron` jobs (`OrderEscrowCron`, `AccountAnonymizeCron`, `savedSearchAlerts`) have **no leader election / distributed lock**. With >1 API replica, every replica runs every cron → duplicate escrow release attempts (idempotent claim saves you on escrow via `updateMany` predicate, L453, but `savedSearchAlerts` would double-email and `accountAnonymize` would double-process). See PERF-012. |
| CDN / caching headers | **Gap** | API sets no `Cache-Control` on public GETs (games, listing detail). Vercel fronts the Next apps (good for static/image CDN) but API responses through the `/api/*` rewrite are uncacheable at the edge. No `s-maxage`/`stale-while-revalidate` on `listGames`/`getGameBySlug`/leaderboard — all effectively immutable for minutes. See PERF-006/PERF-013. |
| Connection pool vs Neon pooler | **Needs validation** | pool=10 per replica × replicas must stay under Neon's pgbouncer ceiling (PERF-003). |
| Memory-leak risks | **Low** | `userSockets` Map is cleaned on disconnect (L156–168); `lastSeenFallbackMap` (jwt.strategy L22) **never evicts** — it grows unbounded with distinct user IDs in single-replica/no-Redis mode. Minor leak. See PERF-007. |

---

## Prioritized remediation

1. **PERF-001** Move ThrottlerModule to a Redis store before scaling past 1 replica.
2. **PERF-002** Cache the auth user lookup (short-TTL Redis or in-process LRU keyed by `sub`, invalidated on ban/password-change) — highest-frequency query.
3. **PERF-012** Add a distributed lock / leader election for crons before running >1 replica.
4. **PERF-004** Memoize/cron-precompute the admin dashboard aggregates; the 60s poll over full-table `_sum` is the most expensive recurring query.
5. **PERF-005 / PERF-009** Replace `take:100`/`OFFSET` on user-facing lists with the cursor pattern already proven in `getMyListings`.
6. **PERF-008** Add a `jsonb_path_ops` GIN index (or promote hot account attributes to real columns) for the ACCOUNTS filter facets.
7. **PERF-003 / PERF-006 / PERF-013** Validate pool sizing under load; add edge/CDN cache headers + Redis caching for immutable public reads.
