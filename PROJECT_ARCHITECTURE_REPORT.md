# GETX Marketplace — Principal Software Architect Audit (Read-Only)

**Scope:** Whole-repo structural + architectural review of the GETX gaming marketplace (`d:\GetX_`). Backend NestJS 11 + Prisma/Postgres/Redis (`apps/api`), three Next.js 15 / React 19 frontends (`apps/web`, `apps/seller`, `apps/admin`), shared packages (`packages/{database,types,ui,utils,games}`). Payments via Stripe + Stripe Connect + mock fallback. KYC via Sumsub. Deployed to Railway (API) + Vercel (frontends).

**Verification posture:** Every claim below was checked against real source. Correct controls are explicitly acknowledged. Items that need a running system are marked `Info` with the exact test to run.

---

## 1. System Context

```
                         ┌────────────────────────────────────────────────────┐
                         │                   END USERS                         │
                         │   Buyers        Sellers        Admins/Ops           │
                         └──────┬──────────────┬───────────────┬───────────────┘
                                │              │               │
                    Vercel (bom1 / Mumbai region) — Next.js 15 SPAs
              ┌─────────────────┼──────────────┼───────────────┼──────────────┐
              │  apps/web :3000  │ apps/seller :3001 │ apps/admin :3002         │
              │  (buyer + auth)  │ (dashboard)       │ (ops console, noindex)   │
              │  CSP: strict     │ CSP: NONE         │ CSP: NONE                │
              └─────────────────┬┴──────────────────┴┬──────────────────────────┘
                                │  same-origin /api/* (Next rewrites → API_UPSTREAM_URL)
                                │  httpOnly cookies (accessToken 15m / refreshToken 24h–7d)
                                ▼
                 ┌──────────────────────────────────────────────────┐
                 │   NestJS 11 API  (Railway, Docker, node:24)       │
                 │   global prefix /api/v1   29 feature modules      │
                 │   APP_GUARDs: Throttler → JwtAuthGuard → Roles    │
                 │   helmet + CSRF(415) + CORS allowlist + Zod       │
                 └───┬───────────┬──────────┬──────────┬──────────┬──┘
                     │           │          │          │          │
                ┌────▼───┐  ┌────▼────┐ ┌───▼────┐ ┌───▼───┐  ┌───▼─────┐
                │Postgres│  │ Redis   │ │ Stripe │ │Sumsub │  │ R2 / S3 │
                │(Neon,  │  │(ioredis,│ │+Connect│ │ KYC   │  │ uploads │
                │ Prisma)│  │optional)│ │+webhook│ │webhook│  │         │
                └────────┘  └─────────┘ └────────┘ └───────┘  └─────────┘
                                 │
                          Resend (email) · Google/Discord OAuth
```

The three SPAs never call the API cross-origin in production: each Next app proxies `/api/*` to `API_UPSTREAM_URL` via `rewrites()` (`apps/web/next.config.mjs:102`), making the browser see same-origin requests so `SameSite=lax` httpOnly cookies survive Safari ITP. Session is **never** a token in JS/localStorage.

---

## 2. Application / Service Topology

### 2.1 Backend modules (verified 29 `*.module.ts`)
`AppModule` (`apps/api/src/app.module.ts`) wires: `ConfigModule (global, cached)`, `EventEmitterModule (maxListeners 20)`, `ScheduleModule`, `ThrottlerModule (60req/60s)`, then 25 feature modules + `Prisma/Audit/Mail/Health`. Boundaries are clean and domain-aligned: `auth`, `games`, `listings`, `offers`, `custom-requests`, `saved-searches`, `orders`, `payments`, `payouts`, `wallet`, `conversations`, `notifications`, `reviews`, `users`, `account`, `addresses`, `payment-methods`, `webhooks`, `referrals`, `loyalty`, `rank`, `uploads`, `waitlist`, `admin`.

The `admin` module was split into five focused services (`admin-dashboard/user/order/content/finance.service.ts`) — a good maintainability move that keeps each surface small.

### 2.2 Request lifecycle (HTTP)
```
Request
  → helmet (HSTS 2yr, no-referrer)               main.ts:74
  → cookieParser                                  main.ts:83
  → body json (1mb webhooks / 100kb else, rawBody only on /webhooks/)  main.ts:87
  → CSRF guard: 415 unless Content-Type: application/json (POST/PATCH/PUT/DELETE)  main.ts:102
  → CORS allowlist (WEB/SELLER/ADMIN_URL CSV)     main.ts:127
  → Router (global prefix /api/v1)
  → APP_GUARD ThrottlerGuard  → JwtAuthGuard (@Public bypass) → RolesGuard   auth.module.ts:50-53
  → Controller (per-route Zod .parse())
  → Service (Prisma, $transaction for money)
  → AllExceptionsFilter (5xx → structured JSON) then ZodExceptionFilter (→400)  main.ts:149
```
There is **no global `ValidationPipe`** (confirmed — only a comment at `main.ts:143`); validation is per-route Zod, which is consistent across controllers but relies on every handler remembering to `.parse()`.

### 2.3 Frontend topology
All three apps are effectively SPAs (`'use client'` pages; server components limited to layouts + OG route handlers). Data layer is TanStack Query wrapping per-app axios clients (`src/lib/api.ts`) with a single shared 401→refresh-once→replay interceptor (`apps/web/src/lib/api.ts:48`). Auth bootstrap uses native `fetch` to `/auth/session` to avoid the refresh interceptor on logged-out visits. Seller/admin add a **server-side** middleware gate (`middleware.ts`) that calls `/auth/session` with the forwarded cookie before the bundle ships.

---

## 3. Auth & Authorization

### 3.1 Strengths (verified, well-built)
- **Token design** (`auth.service.ts:860`): access = HS256 JWT (`getx.live`/`getx-api`, 15m); refresh = opaque `randomBytes(48)` stored only as SHA-256 hash with a `family`. A DB dump cannot mint a usable refresh token.
- **Refresh rotation + theft detection** (`auth.service.ts:429`): a revoked-but-presented token revokes the entire family and writes a `CRITICAL` audit.
- **Password-change invalidation** (`jwt.strategy.ts:102`): access tokens issued before `passwordChangedAt` are rejected.
- **Login hardening** (`auth.service.ts:305`): constant-time bcrypt with dummy hash, failed-count lockout (5→15m), account-state checks **after** password to avoid status leakage, email-enumeration-safe register/forgot flows.
- **bcrypt cost 12**, OTP via `crypto.randomInt` + SHA-256 hash with attempt cap.
- **Guard order** is correct: Throttler short-circuits before auth; `JwtAuthGuard` populates `req.user` before `RolesGuard` reads `user.role`. Admin controller relies on this global ordering (`admin.controller.ts:45` only declares `RolesGuard` + `@Roles`).

### 3.2 Weaknesses
- **Authorization is coarse role-only.** `RolesGuard` (`roles.guard.ts:30`) checks `user.role === role`. There is no per-resource policy layer; object-level ownership is enforced ad-hoc inside each service (e.g. `order.buyerId !== userId`). This works today but every new endpoint must remember the ownership check — there is no central enforcement, which is a latent IDOR risk surface (see ARCH-009).
- **JWT secret strength is enforced; Stripe/Sumsub/R2/OAuth secrets are not.** Boot fail-fast (`main.ts:28`) validates `DATABASE_URL/JWT_*/PII_ENCRYPTION_KEY/WEB|SELLER|ADMIN_URL` but never presence/format-checks payment or KYC secrets — those silently degrade to mock/unverified paths (ARCH-006).

---

## 4. Data Model

PostgreSQL via Prisma, 1724-line schema, 14 migrations. Money is uniformly `Decimal(14,2)` (the DB-CRIT migration `20260529000001` converted all amounts off `Float`) — **excellent**; no float money columns remain. FX rates `Decimal(12,6)`. IDs are `cuid()`.

### 4.1 Relationship integrity (mixed)
Most relations have explicit `onDelete` semantics chosen for compliance (e.g. `KycDocument` Restrict, `AuditLog.userId` SetNull to preserve trail, `Conversation` order/offer Restrict as chat evidence, `UserPii` Cascade). However three ledger/relationship tables use **bare String columns with zero FK constraints**, confirmed in schema:
- `WalletTransaction.orderId / withdrawalId / refundId` (`schema.prisma:1098-1100`) — money ledger rows can reference non-existent orders.
- `Favorite.userId / productListingId / customRequestId / sellerId` (`schema.prisma:1487-1492`).
- `Payout.sellerId` and `LoyaltyTransaction.orderId / referralId` (per data-model map).

This is referential-integrity debt: orphaned ledger rows are possible and reconciliation must be done in app code, not enforced by the DB (ARCH-007).

### 4.2 Denormalization without triggers
Counters are pervasive (`Game.totalListings/Orders/Sellers`, `ProductListing.soldCount/reservedCount/viewCount`, `Conversation` unread counts, `CustomRequest.uniqueViewerIds[]`) and kept consistent **only in app code** with no DB triggers. Any code path that mutates the underlying rows but forgets the counter update silently drifts (ARCH-011).

### 4.3 Out-of-band trigram GIN indexes
GIN trigram indexes on `ProductListing` + `CustomRequest` title/description are applied via raw SQL outside Prisma's model, which the infra map notes causes Prisma schema drift. Acceptable but must be documented in the runbook so `prisma migrate` doesn't fight it.

---

## 5. Payment & Escrow Architecture

### 5.1 Flow
```
createFromListing/Offer (orders.service.ts:147)
  └─ $transaction: atomic stock reserve (updateMany stock>=qty) + Order(PENDING/PENDING)
       fees: BUYER_FEE 8% + rank-based seller commission (default 10%)
       orderNumber ORD-YEAR-<5 rand bytes>            ← collision-safe (no count+1)
  ▼
[buyer applies wallet ≤50% / loyalty — mutually exclusive]  wallet.service.ts:87
  ▼
createCheckoutSession (payments.service.ts:74) → Stripe Checkout (Tax + 3DS auto)
  ▼
Stripe webhook /payments/webhook/:provider  (fail-closed if no secret)
  parseWebhook: HMAC sha256 + 5-min replay window + timingSafeEqual   stripe.provider.ts:274
  dispatchEvent: WebhookEvent(provider,externalId) idempotency        payments.service.ts:231
  processCheckoutCompleted:
     verifies amount±1¢ AND currency vs order (PAY-CRIT-003)          payments.service.ts:331
     writes WebhookEvent INSIDE the $transaction (atomic idempotency) payments.service.ts:375
     Order → PAID / escrow HELD, autoReleaseAt = now+3d
  ▼
markDelivered (seller) → confirmReceipt (buyer, blocked by open dispute)
  releaseToSeller: atomic updateMany WHERE escrowStatus=HELD (idempotent claim)  orders.service.ts:453
     credits sellerWallet + WalletTransaction, emits ORDER_EVENTS.RELEASED
     listeners (wallet/loyalty/rank) run cashback/XP async, outside the money tx
  ▼
OrderEscrowCron hourly → sweepExpiredEscrow (autoReleaseAt<now, excludes open disputes, cap 500)
```

### 5.2 Strengths (genuinely strong)
- **Idempotency is correct end-to-end**: `WebhookEvent (provider, externalId)` unique, written **inside** the handler transaction so a handler failure rolls back both state and the idempotency row; P2002 is treated as a concurrent-commit idempotent skip.
- **Amount + currency verification** prevents a $1 session settling a $1000 order.
- **Escrow release uses an atomic `updateMany` claim** on `escrowStatus:HELD`, so two concurrent releases cannot double-credit.
- **Withdraw path** (`wallet.service.ts:296`): combined buyer+seller balance check, **KYC VERIFIED required**, per-method floors, daily velocity (5 req / $5k), atomic debit predicates (`updateMany ... gte`), bank PII encrypted via `encryptPii`, manual admin approval queue. Refund clawback debits `sellerWallet` when escrow was already RELEASED.
- **Refund webhook** distinguishes full vs partial and claws back released escrow (`payments.service.ts:617`). Connect `account.updated` webhook keeps `payoutsEnabled` in sync and gates Wise/Bank withdrawals.

### 5.3 Weaknesses / Risks
- **Admin money-movement CRITICAL audits commit OUTSIDE the money transaction** (`admin-order.service.ts:103/136`, `:206/255`, `:296/340`). The wallet `$transaction` commits first, then `audit.log({severity:'CRITICAL'})` runs. The whole point of the CRITICAL-rethrow in `AuditService.log` (`audit.service.ts:48`) — "money movement with no audit record" — is defeated here, because the rethrow only rolls back when the audit call is *inside* the tx (as it is in the auto/escrow path). An audit-DB hiccup after a force-release leaves money moved with no CRITICAL trail (ARCH-002).
- **Order creation / checkout has no buyer email-verify or KYC gate** (`orders.service.ts:147`, `payments.service.ts:74`). Login requires `emailVerified`, but nothing re-checks it at purchase; OAuth accounts default `country: 'US'` and `kycStatus: NONE`. Funds are escrowed so loss is bounded, but it allows unverified/sanctioned-geo-by-default buyers to transact (ARCH-008).
- **`simulateMockPayment` unit bug** (`payments.service.ts:769`): sets `amount: Math.round(order.buyerTotal * 100)` (cents) into a `WebhookEvent.amount` that `processCheckoutCompleted` treats as **dollars** (it does `event.amount * 100` again). Real Stripe events are correct (`stripe.provider.ts:253` divides by 100). Dev-gated (`PAYMENTS_ENABLE_MOCK` + non-prod), so impact is low, but it means the mock path exercises a different amount than production and the amount-verification check is effectively bypassed in dev (ARCH-014).
- **Mock checkout page POSTs a form** to `/payments/mock-pay` with default `application/x-www-form-urlencoded` (`payments.controller.ts:131`), which the global CSRF middleware rejects with 415 (`main.ts:105`). Dev-only, but the dev mock-pay flow is broken as written (ARCH-015, Low).

---

## 6. Third-Party Integrations

| Integration | Implementation | Posture |
|---|---|---|
| **Stripe Checkout** | Custom `fetch` provider (`stripe.provider.ts`), no SDK | HMAC verify + replay window; prod refuses to start without `STRIPE_SECRET_KEY` (`payments.service.ts:53`). Solid. |
| **Stripe Connect** | `stripe-connect.service.ts`, Express onboarding + `account.updated` webhook | Idempotent `ensureAccount`, mock fallback in dev. Good. |
| **Sumsub KYC** | `webhooks/sumsub.controller.ts` | HMAC (sha256/512/1) + hex `timingSafeEqual`, Zod shape, idempotency `applicantId:type:createdAt`, **prod refuses unsigned**. Strong. |
| **OAuth (Google/Discord)** | passport strategies | Link-by-providerId → link-by-email → create password-less (`country:'US'`, emailVerified set). Account-linking by email is convenient but trusts the provider's verified email (acceptable for Google/Discord). |
| **Redis** | `common/redis.factory.ts` singleton, **optional** | Used for Socket.IO adapter + lastSeen SETNX. Returns `null` when unset — every caller guards. Clean. |
| **Resend (email)** | mail module, fire-and-forget | Failures logged, never block flows. Good UX, but no retry/queue (deferred). |
| **R2/S3 uploads** | magic-byte MIME validation, key derived from validated MIME (anti-`.php`) | Strong upload hardening. |

The custom `fetch`-based Stripe provider (no official SDK) is deliberate (smaller deps) but means GETX owns webhook parsing, retries, and API-version drift manually — a maintenance liability as Stripe evolves (ARCH-013).

---

## 7. State Management, Realtime, Error Handling

- **Realtime**: `ChatGateway` (socket.io `/chat`) authenticates on connect via cookie→`auth.token`→query token, **rejects banned/suspended on connect**, per-user/per-conversation rooms, `SocketRateLimiter`, presence is opt-in (`watch_presence`) — fixing the old O(n²) broadcast. Redis adapter enables cross-replica fan-out *when `REDIS_URL` is set*; otherwise logs a single-replica warning. One soft spot: **no-Origin WS connections are allowed** (`chat.gateway.ts:59`) — intentional for mobile/webviews but widens the surface; JWT still gates everything, so risk is low.
- **Error handling**: `AllExceptionsFilter` + `ZodExceptionFilter` give consistent structured JSON; 5xx are logged as single lines without bodies (no PII leak). `AuditService` swallows non-critical audit failures and rethrows only CRITICAL — a deliberate money-trail-integrity design (with the caveat in §5.3).
- **Frontend state**: React Context (auth) + TanStack Query cache; no Redux/Zustand. The single 401-refresh interceptor is correctly de-duplicated (`isRefreshing` + subscriber queue).

---

## 8. Deployment Topology

```
Railway (API)                              Vercel (web/seller/admin, region bom1)
─────────────                              ──────────────────────────────────────
Dockerfile (node:24, pnpm 10.15.0)         per-app vercel.json, corepack pnpm 11.0.8
  deps → build → prod (ships FULL /app)    build from repo root, prisma generate + build
  EXPOSE 4000, CMD node dist/main          Next 15.5 / React 19
  HOST=0.0.0.0, trust proxy=1              rewrites /api/* → API_UPSTREAM_URL
  healthcheck /api/v1/health (SELECT 1)    web: full CSP | seller+admin: NO CSP
  migrations NOT auto-run (manual)
```

### Weaknesses
- **No CI/CD whatsoever** — confirmed no `.github/workflows`. No automated lint/typecheck/test/security gate. Deploys rely entirely on Railway/Vercel build success (ARCH-001, High).
- **Effectively no tests** — only `app.controller.spec.ts` (Nest boilerplate) + an empty e2e stub, despite a money-handling escrow system. Zero coverage of payments/escrow/auth (ARCH-003, High).
- **Toolchain version fragmentation**: Docker installs `pnpm@10.15.0` while root pins `pnpm@11.0.8`; Node target is split (Docker node:24, `engines >=20`, API `@types/node` 24 vs frontend 20). Lockfile resolution differences between build environments are possible (ARCH-010).
- **`bcryptjs ^2.4.3`** — pure-JS (slower than native, cost-12 hashes block the event loop longer) and a major version behind (3.x). Confirmed in `auth.service.ts` + `account.service.ts` (ARCH-012, Low).

---

## 9. Scalability Concerns

| Concern | Evidence | Effect |
|---|---|---|
| **Rate limiter is in-memory** | `app.module.ts:50` comment; no `ThrottlerStorage` provider wired | Throttling is **per-replica**. Horizontal scaling multiplies effective limits (N pods → N×limit) and the limit is unenforceable globally. Redis store exists conceptually but is not wired. (ARCH-004) |
| **Socket.IO single-replica unless Redis set** | `chat.gateway.ts:86` | Without `REDIS_URL`, chat/order pushes never reach clients on other pods. Operationally this means you cannot scale the API horizontally without Redis. (ARCH-005) |
| **Offset pagination on hot list paths** | `listings.service.ts:368` (`skip`/`take`), `orders.service.ts:679` (`take:100`, no pagination) | `O(offset)` scans degrade as catalogue/order history grows. A cursor variant exists only for the seller catalogue (`listings.service.ts:696`); buyer browse + admin lists still offset-paginate, and `listMyOrders` is hard-capped at 100 with a TODO. (ARCH-011/scal) |
| **Prisma pool** | recent commit `bb9e06a` raised `connection_limit 1→10` on Neon pgbouncer | Correct fix, but 10 connections per replica against a pooled Neon endpoint needs capacity planning before scaling pods. |

---

## 10. Security Headers / CSP Gap

`apps/web` ships a strict, well-constructed CSP (frame-ancestors none, object-src none, scoped connect/img/script-src, `upgrade-insecure-requests`) and dropped `unsafe-eval`. **`apps/admin` and `apps/seller` ship NO CSP** (`apps/admin/next.config.mjs:45` sets only XFO/nosniff/Referrer/Permissions). The admin console — the highest-value target (ban users, force-release escrow, refund) — has the weakest header posture. Admin does set `robots: noindex`, and both have server-side middleware role gates, but a stored-XSS in any admin-rendered field (e.g. a user-supplied username/bio shown in the admin user table) would run unconstrained (ARCH-006/headers, Medium).

---

## 11. Summary Scorecard

| Dimension | Score | Rationale |
|---|---|---|
| **Architecture** | 78 | Clean module boundaries, strong money-path design (Decimal, atomic claims, idempotent webhooks, escrow), good auth. Pulled down by audit-outside-tx, coarse authz, dangling FKs, custom Stripe layer. |
| **Scalability** | 55 | In-memory throttler + Redis-optional Socket.IO mean the system is single-replica-correct only. Offset pagination on hot paths. Solid DB indexing partially offsets. |
| **Maintainability** | 62 | TypeScript end-to-end, Zod validation, good module split, thorough inline rationale. Severely undercut by zero CI, near-zero tests, toolchain version drift, hand-rolled Stripe. |

---

## 12. Prioritized Recommendations (what / why / impact / fix)

1. **Wire CI + a payments/escrow test suite (ARCH-001, ARCH-003).** *What:* no `.github/workflows`, only boilerplate tests. *Why:* a real-money escrow system has no regression net. *Impact:* a refactor can silently break double-credit guards or amount verification. *Fix:* add a GitHub Actions pipeline (typecheck + lint + `jest` + `prisma validate`) gating merges; write integration tests for `releaseToSeller` idempotency, webhook amount/currency verification, and withdraw velocity.
2. **Move admin CRITICAL audits inside the money `$transaction` (ARCH-002).** *Fix:* call `audit.log` with the `tx` client inside the `$transaction` in `admin-order.service.ts` force-release/refund/dispute, mirroring the auto-release path, so the CRITICAL-rethrow actually rolls money back.
3. **Wire the Redis throttler store + require Redis for multi-replica (ARCH-004, ARCH-005).** *Fix:* add `@nestjs/throttler` Redis storage when `REDIS_URL` is set; document that horizontal scaling requires Redis (throttler + Socket.IO adapter).
4. **Add a CSP to admin and seller (ARCH-006).** *Fix:* port the web CSP (tightened for each app's connect-src) into `apps/admin` + `apps/seller` `next.config.mjs`.
5. **Add FK constraints to ledger/favorite tables (ARCH-007)** or document the intentional decoupling and add a reconciliation job.
6. **Gate purchase/checkout on email-verified (and KYC for high-value/withdraw-linked flows) (ARCH-008).**
7. **Validate Stripe/Sumsub secret format at boot (ARCH-006/secrets)** to fail fast instead of silently degrading to mock.

See the issues list for the full enumerated set.
