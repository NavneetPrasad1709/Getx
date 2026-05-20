# GETX Production Audit — Step-by-Step

> Senior marketplace audit. Each phase has a goal, the exact files/queries to inspect, specific checks, and acceptance criteria. Work top-to-bottom; do not skip ahead. Fix issues inline as they are found. Tick boxes (`[x]`) only when verified end-to-end.

Last started: 2026-05-20
Auditor: Claude (Opus 4.7) + Navneet Prasad
Target: getx.gg — gaming marketplace, multi-currency USD-primary

---

## Phase 0 — Baseline & Environment

**Goal:** know what's deployed, where, and against what config.

- [ ] `git status` is clean on `main`; `git log -1` notes are accurate
- [ ] Vercel projects (`getx-web`, `getx-seller`, `getx-admin`) — last deploy READY, commit matches `HEAD`
- [ ] Railway service `getx-api` — last deployment SUCCESS + service responds 200 on `/api/v1/health` (or auth/me 401 — anything but 502)
- [ ] Neon Postgres `getx-prod` — `SELECT 1` returns from local `prisma db execute`
- [ ] Env vars present on each platform: list per-project counts via API

**Commands:**
```bash
# Local
git status && git log -1 --oneline
pnpm --filter @getx/database db:execute --stdin <<<"SELECT 1;"

# Railway
curl -i https://api-production-0ef8.up.railway.app/api/v1/health || echo "no /health route — add one in Phase 4"

# Vercel
vercel ls --cwd D:/GetX_   # for each linked project
```

---

## Phase 1 — Code health

**Goal:** the code compiles, lints, and has no dead modules before we worry about behavior.

- [ ] `pnpm typecheck` passes on every workspace (`@getx/api`, `@getx/web`, `@getx/seller`, `@getx/admin`, all packages)
- [ ] `pnpm lint` passes (or any errors are intentional + documented)
- [ ] `pnpm build` succeeds on every app (no implicit dev-only deps used in prod)
- [ ] No `console.log` / `debugger` in prod code (search `apps/*/src`, `packages/*/src`)
- [ ] No `// TODO` / `// FIXME` that block launch (triage list, defer the rest)
- [ ] Unused workspace packages — `pnpm why <pkg>` to verify each is actually referenced

**Acceptance:** zero TS errors, zero lint errors, all builds green.

---

## Phase 2 — Database (schema + queries)

**Goal:** the data layer can survive 20 lakh users without N+1s, missing indexes, or runaway writes.

- [ ] Open `packages/database/prisma/schema.prisma` end-to-end
- [ ] Every column used in a `where` clause has an `@@index` (or is in a unique constraint)
  - Spot check: `User.email`, `ProductListing.gameSlug`, `ProductListing.status`, `Order.buyerId`, `Order.sellerId`, `Order.status`, `Order.escrowStatus`, `Order.autoReleaseAt`, `Dispute.orderId`, `Dispute.status`
- [ ] Composite indexes on common filter pairs: `(gameSlug, tabType)`, `(sellerId, status)`, `(status, createdAt)`
- [ ] Cascade behavior is intentional — financial rows (Order, Payment, Withdrawal, WalletTransaction, AuditLog) must NOT cascade-delete on user deletion
- [ ] Soft-delete columns (`deletedAt`/`isDeleted`) exist on user-visible resources OR a clear policy that hard delete is allowed
- [ ] No raw SQL with string interpolation (`$queryRawUnsafe` with user input) — only parameterized `$queryRaw\`\``
- [ ] Migration history (`migrations/*`) — each migration is forward-only, no manual edits to applied migrations
- [ ] Pagination present on every `findMany` that can grow unbounded (listings, orders, audit logs, reviews, messages)
- [ ] N+1 sweep — for every `.findMany`, the consumer either selects only what it needs OR uses `include` for the relation it loops over

**Commands:**
```bash
pnpm --filter @getx/database db:validate
grep -rn "findMany" apps/api/src | grep -v "take:" | grep -v "limit:"   # uncapped queries
grep -rn "queryRawUnsafe" apps/api/src                                    # SQL injection risk
```

---

## Phase 3 — Auth & session security

**Goal:** no session hijack, no privilege escalation, cookies sealed.

- [ ] `apps/api/src/auth/auth.service.ts` — password hash uses `bcrypt` with rounds ≥ 12
- [ ] JWT access token TTL ≤ 15m; refresh token TTL ≤ 7d; refresh token rotation on every use
- [ ] Refresh tokens stored hashed (not plaintext) if persisted; revocation list works
- [ ] Cookies: `httpOnly: true`, `secure: true` in prod, `sameSite: 'lax'` (or `'none'` only if cross-site needed), `domain` set to apex so subdomains share
- [ ] `apps/api/src/auth/guards/jwt-auth.guard.ts` + `roles.guard.ts` — both registered as `APP_GUARD` so all routes guarded by default unless `@Public()`
- [ ] `/auth/login` + `/auth/refresh` throttled (Throttler config; brute-force limit)
- [ ] `/auth/me` is the only endpoint that returns 401 to anonymous users; everything else is 403 or 404
- [ ] Email enumeration on `/auth/register` + `/auth/forgot-password` — same response shape whether email exists or not
- [ ] CSRF: same-site cookies + `withCredentials` on the client; alternatively a CSRF token
- [ ] Sessions invalidated on password change

**Commands:**
```bash
grep -rn "bcrypt" apps/api/src/auth
grep -rn "httpOnly\|sameSite\|secure:" apps/api/src
grep -rn "@Throttle\|ThrottlerGuard" apps/api/src
```

---

## Phase 4 — API surface (controllers/services)

**Goal:** every endpoint validates input, returns predictable errors, has pagination caps.

- [ ] CORS allowlist in `apps/api/src/main.ts` includes prod web/seller/admin URLs
- [ ] Helmet + cookie-parser mounted; `trust proxy 1` set (Railway is behind a reverse proxy)
- [ ] Every `@Body` / `@Query` parsed through a Zod schema, not raw `any`
- [ ] DTOs cap `limit` ≤ 100 and `page` ≥ 1
- [ ] Global `ZodExceptionFilter` returns field-level 400, not 500
- [ ] `/api/v1/health` exists and returns `{ ok: true }` with DB ping (for Railway healthcheck + Neon warm-up)
- [ ] No endpoint returns more than what the caller needs (avoid leaking `passwordHash`, `refreshTokenHash`, `email` to unauthorized callers)
- [ ] Sensitive endpoints (`/admin/*`, `/seller/*`, `/wallet/*`, `/payouts/*`) verify ownership in addition to role

**Commands:**
```bash
grep -rn "@Body()" apps/api/src | grep -v "Schema.parse"   # un-validated bodies
grep -rn "passwordHash\|refreshTokenHash" apps/api/src/*/[a-z]*.service.ts | grep -v "// safe"
```

---

## Phase 5 — Payments + escrow + refunds

**Goal:** money can never leak. Every transition is idempotent and reconcilable.

- [ ] `apps/api/src/payments/payments.service.ts` — `resolveProvider()` throws in prod if Razorpay/Stripe keys are missing (no silent mock fallback)
- [ ] Webhook handlers verify HMAC signature against the raw request body (not parsed JSON)
- [ ] Every webhook handler is idempotent — replays do not double-credit / double-refund / overwrite
- [ ] `Order` status machine documented: PENDING → PAID → IN_PROGRESS → DELIVERED → COMPLETED, with explicit failure transitions (CANCELLED, DISPUTED, REFUNDED)
- [ ] Escrow auto-release cron excludes orders with any active dispute (OPEN/REVIEWING/AWAITING_RESPONSE/ESCALATED)
- [ ] Refund flow updates `refundTransactionId` + `refundedAt` exactly once
- [ ] Wallet ledger — every credit/debit produces a `WalletTransaction` row inside a transaction; no orphan writes
- [ ] Payouts — KYC required before bank/UPI/PayPal payout can be requested
- [ ] Currency handling — amounts stored as cents/paise (integer) OR Decimal; never `Float` for money

**Commands:**
```bash
grep -rn "RAZORPAY_WEBHOOK_SECRET\|STRIPE_WEBHOOK_SECRET\|webhookSecret" apps/api/src
grep -rn "rawBody\|verify(req" apps/api/src
grep -rn "Float\|number" packages/database/prisma/schema.prisma | grep -iE "amount|price|fee|payout"
```

---

## Phase 6 — Listings + search

- [ ] Slug generation is collision-safe (random suffix on conflict, not first-match overwrite)
- [ ] Soft delete on listings (PAUSED/REMOVED states preserve order history)
- [ ] Filter params validated; `priceMin <= priceMax` enforced
- [ ] Search uses Postgres trigram or full-text index, not `LIKE %?%` scan
- [ ] Listing detail endpoint excludes seller PII (email/phone)
- [ ] Image URLs returned are absolute (CDN domain), not relative
- [ ] Stock/quantity decremented inside the order-creation transaction

---

## Phase 7 — Uploads / R2 / images

- [ ] `apps/api/src/uploads/*` — file size cap (e.g., 10 MB images, 50 MB attachments)
- [ ] MIME validation by magic bytes, not just the client-provided header
- [ ] Filenames sanitized; no path traversal; UUID-based storage keys
- [ ] R2 bucket policy denies public list; presigned URLs expire ≤ 1 hour
- [ ] `next.config.mjs` `images.remotePatterns` whitelists exactly the R2 + CDN hosts being used
- [ ] OG image generation route caches results (don't re-render per request)

---

## Phase 8 — WebSocket / chat / notifications

- [ ] Socket.IO handshake verifies the same cookie/JWT as REST routes
- [ ] Room membership server-enforced (cannot subscribe to another user's room)
- [ ] Message size cap; rate limit per socket
- [ ] Disconnect cleanup — no leaked timers / subscriptions
- [ ] Notifications service idempotent (no duplicate "order shipped" on retry)

---

## Phase 9 — Frontend `apps/web`

- [ ] `next.config.mjs` — no `localhost` URLs in `images.remotePatterns`, `redirects`, or env defaults
- [ ] Every route under `src/app/**/page.tsx` has the correct `generateMetadata` (title + description + canonical + og + twitter)
- [ ] No internal nav uses `<a href>` for app routes; all use `next/link` `<Link>`
- [ ] No `window.location.href = '/internal/path'` for client-side nav (allowed for cross-app like `/seller/*` redirect)
- [ ] Data hooks (`use-listings`, `use-auth`, etc.) handle `isLoading`/`error` properly — no infinite skeletons
- [ ] React Query — `staleTime` set; `refetchOnWindowFocus` configured; query keys are stable
- [ ] Axios has request timeout (default infinite is unsafe — pick 15s)
- [ ] Error boundary wraps `app/layout.tsx`; route segments have `error.tsx`
- [ ] `loading.tsx` exists for slow segments; skeleton matches final layout to avoid CLS
- [ ] No `ssr: false` dynamic import in Server Components (Next 15 rule)
- [ ] PageTransition / motion wrappers don't block routing
- [ ] Sitemap.xml + robots.txt + manifest.webmanifest present and correct

---

## Phase 10 — Frontend `apps/seller`

- [ ] Auth-required gate redirects to `/auth/login` from anywhere except `/auth/**`
- [ ] Listing-form validation matches API DTO exactly (no client passes that the server rejects)
- [ ] Image upload preview uses object URLs that are revoked on unmount
- [ ] Earnings/payouts pages reload after successful action (or use optimistic updates correctly)
- [ ] Live order updates via WebSocket (otherwise sellers miss new orders)

---

## Phase 11 — Frontend `apps/admin`

- [ ] Login flow checks the role server-side, NOT just hides admin links
- [ ] Every destructive action (ban user, hide listing, force refund) requires a typed reason + audit log entry
- [ ] CSV exports are paginated / streamed, not single 500 MB blob

---

## Phase 12 — UI / UX / Accessibility

- [ ] Color contrast ≥ 4.5:1 on body text, 3:1 on large/icon text
- [ ] Every interactive element keyboard-reachable; focus ring visible
- [ ] Skip-to-content link present (we have it; verify it's the first focusable element)
- [ ] Form labels associated (`htmlFor` matches `id`)
- [ ] Toasts also announce via `aria-live` polite
- [ ] Mobile bottom-bar nav doesn't overlap last list item (safe-area-inset-bottom)
- [ ] Loading skeletons have `aria-busy` + descriptive label
- [ ] No motion ignores `prefers-reduced-motion`

---

## Phase 13 — Performance

- [ ] Lighthouse mobile ≥ 90 perf, 100 a11y, 100 best-practice, 100 SEO
- [ ] LCP < 2.5s on the landing page (over 4G throttling)
- [ ] INP < 200ms on tab click + filter change
- [ ] CLS < 0.1 — verify hero/skeleton dimensions match real content
- [ ] Bundle: web `First Load JS` shared ≤ 110 KB; route-specific ≤ 80 KB
- [ ] All `<Image>` have width/height OR `fill` with sized parent
- [ ] Fonts loaded via `next/font` with `display: swap`
- [ ] No client-side fetch waterfalls on first paint (parallelize with `Promise.all`)

---

## Phase 14 — Observability

- [ ] Vercel Web Analytics + Speed Insights installed in each frontend root layout
- [ ] API logger never logs `passwordHash`, `refreshToken`, `bankAccountEncrypted`, `RESEND_API_KEY`, etc.
- [ ] Errors propagate to Sentry / OTel / Better Stack — at minimum, NestJS uncaught exception handler logs structured JSON
- [ ] Audit log written on every admin action and every money movement
- [ ] Health endpoint suitable for uptime monitors (UptimeRobot, etc.)

---

## Phase 15 — Infra

- [ ] Vercel: `getx-web/seller/admin` have `NEXT_PUBLIC_API_URL` pointing to Railway, plus `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_WEB_URL`, `NEXT_PUBLIC_SELLER_URL`, `NEXT_PUBLIC_ADMIN_URL`
- [ ] Railway: `getx-api` env has `DATABASE_URL`, `DIRECT_URL`, `JWT_*`, `PII_ENCRYPTION_KEY`, `COOKIE_DOMAIN`, `WEB_URL`, `SELLER_URL`, `ADMIN_URL`, `RESEND_API_KEY`, `RAZORPAY_*`, `STRIPE_*`, `REDIS_URL`
- [ ] DNS for `getx.gg`, `seller.getx.gg`, `admin.getx.gg`, `api.getx.gg` configured; SSL valid
- [ ] Vercel deployment protection on previews only (not prod)
- [ ] Railway healthcheck path set to `/api/v1/health`
- [ ] Backups: Neon point-in-time recovery confirmed; daily logical dump optional

---

## Phase 16 — Legal / compliance

- [ ] `/terms`, `/privacy`, `/refund` pages match the product (no boilerplate about features we don't have)
- [ ] Cookie consent banner if EU traffic is allowed
- [ ] KYC flow stores Sumsub references, not raw documents
- [ ] PII fields encrypted at rest (bank/UPI/IBAN) — verify via `pii-crypto.ts` round-trip test
- [ ] Data deletion request flow exists (account deletion → anonymize PII, keep financial records)

---

## Phase 17 — Pre-launch smoke

- [ ] Visitor: open landing → click a category tab → see listings → open detail → see seller card
- [ ] Buyer: register → email verify → browse → checkout (test mode) → order shows in `/profile/orders`
- [ ] Seller: register → KYC → create listing → see it on public game page → receive order
- [ ] Order flow end-to-end: paid → delivered → confirmed → escrow released → seller wallet credited
- [ ] Refund: buyer requests → admin approves → buyer wallet credited / payment refunded → order REFUNDED
- [ ] Dispute: buyer opens → admin assigns → resolution releases or refunds
- [ ] WebSocket: open `/messages`, send a message, verify recipient sees it without refresh
- [ ] Admin: ban user → user cannot login → audit log entry exists
- [ ] Mobile: golden path works on a real 4G handset
- [ ] Email: verify Resend "noreply@getx.live" delivers (not in spam)

---

## How we work this list

1. Open the phase. Read the goal.
2. Run the listed commands; open the listed files.
3. Tick each box once you have **observed** the property — not just believed it.
4. When you find an issue, stop and fix it, commit with a clear message, then continue.
5. At the end of each phase, write one paragraph in `AUDIT_LOG.md` (separate file) capturing what was checked, what was fixed, and any deferred follow-ups.

Do not declare a phase done with unticked boxes.
