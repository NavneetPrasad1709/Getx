# FIX_IMPLEMENTATION_PLAN.md

> GETX — global, multi-currency, USD-primary gaming marketplace handling real money, escrow, wallets, and payouts.
> Monorepo: `apps/api` (NestJS 11 + Prisma + Postgres + Redis), `apps/web` (buyer), `apps/seller`, `apps/admin` (Next 15 / React 19), shared `packages/{database,types,ui,utils,games}`. Repo root: `d:\GetX_`.
> This roadmap converts the audit issue register into an ordered, executable plan. Execute phases top-to-bottom; within a phase, execute tasks in listed order.

---

## Sequencing rationale

The order is dictated by money-safety and revenue-unblocking, not by raw severity counts. **Phase 1** establishes the non-negotiable gates that protect real money in flight (Stripe webhook signature integrity, refund/escrow correctness, CRITICAL audit atomicity, and the CI quality gate that lets every later fix ship safely) — without these, any deploy can silently move money to the wrong party or release escrow on undelivered orders. **Phase 2** hardens the front door (OAuth CSRF/`state`, unverified-email account linking, throttler-across-replicas, step-up auth for money actions) because identity is the trust anchor for everything financial. **Phase 3** restores the broken happy paths in strict revenue order — buyers cannot log in (`FLOW-001`), the same-origin proxy/cookie chain is mis-templated so the seller/admin dashboards never open (`FUNC-001/005`, `FLOW-007`), checkout is flag-disabled (`FLOW-003`), seller "become a seller"/CTA buttons fail (`FUNC-003/004`), and KYC has no UI so no one can ever withdraw (`FLOW-004`). **Phase 4** makes the (now reachable) payment lifecycle reliable end-to-end (real `payment_intent` capture for refunds, dispute refunds actually moving buyer money, idempotency keys, decimal math). **Phase 5** removes the scaling cliffs (Redis throttler/cron leader-election as hard prod deps, per-request user-read caching, cursor pagination, dashboard aggregate caching). **Phase 6** ships trust/accessibility/CSP correctness on the dashboards. **Phase 7** locks in long-term quality (strict TS, shared client extraction, FK constraints, dependency hygiene). Cross-cutting items that recur across audit lenses (in-memory throttler, missing CSP, bcryptjs, FK gaps) are consolidated into a single task and cross-referenced so they are implemented once.

> **Note on `verification` field.** Items marked `confirmed` were directly reproduced by the auditors and are weighted highest. Items marked `refuted` are **de-prioritized to footnotes** and must be re-checked, not blindly implemented: `FUNC-002` (cross-subdomain cookie) and `INFRA-001` (Stripe webhook secret boot guard) — see footnotes [^f1][^f2]. Items marked `unverified`/`n/a` are real but require a reproduction step recorded in each task's Testing section.

---

## Launch-blocking checklist (must all be GREEN before public launch)

- [ ] **P1-T1** Stripe payment + Connect webhooks receive `rawBody`; signatures verified, fail-closed (`PAY-001`, `PAY-014`, `BE-02`)
- [ ] **P1-T2** Admin refund passes `currency`; mock provider refuses live refunds in prod (`PAY-002`)
- [ ] **P1-T3** Refunds use real captured `payment_intent`, not the GETX order id (`PAY-003`)
- [ ] **P1-T4** Escrow auto-releases **only** `DELIVERED` orders (`PAY-004`)
- [ ] **P1-T5** Dispute resolution actually issues the buyer refund / wallet credit (`PAY-005`)
- [ ] **P1-T6** Admin money-movement CRITICAL audit logs are inside the wallet `$transaction` (`ARCH-002`)
- [ ] **P1-T7** CI pipeline (typecheck/lint/test/`prisma validate`/audit) is a required check on `main` (`ARCH-001`, `INFRA-02`, `CQ-001`)
- [ ] **P1-T8** Money-path integration tests exist and pass (`ARCH-003`, `CQ-001`)
- [ ] **P1-T9** Prod boot fail-fast requires Stripe webhook + Sumsub + R2 secrets; mock disabled in prod (`INFRA-05`, `ARCH-006`)
- [ ] **P2-T1** OAuth `state` (CSRF) on Google + Discord (`AUTH-001`)
- [ ] **P2-T2** OAuth auto-link only on provider-verified email (`AUTH-004`)
- [ ] **P2-T5** Step-up auth for CRITICAL admin money actions (`AUTH-008`)
- [ ] **P3-T1** Login works end-to-end; OTP mail is a prod boot requirement or clearly mocked (`FLOW-001`)
- [ ] **P3-T2** Frontend env templates use same-origin `/api/v1` proxy + `getx.live` (`FUNC-001`, `FLOW-002/006/007`, `FUNC-005`)
- [ ] **P3-T3** Seller dashboard opens; "become a seller" button works (`FUNC-003`, `FE-001`)
- [ ] **P3-T4** Homepage seller CTAs route correctly with no localhost fallback (`FUNC-004`, `FLOW-005`)
- [ ] **P3-T5** KYC widget (or admin manual-verify) exists so `kycStatus` can reach `VERIFIED` (`FLOW-004`)
- [ ] **P3-T6** Checkout flag documented + flipped; intent capture when off (`FLOW-003`)
- [ ] **P3-T7** Withdrawals gate documented + wired; admin Withdrawals review screen exists (`FLOW-008`, `FLOW-009`)
- [ ] **P5-T1** Throttler + crons + socket adapter require Redis in prod (no per-replica drift / duplicate cron runs) (`ARCH-004`, `PERF-012`, `ARCH-005`)
- [ ] **UIUX-001** Homepage "Featured drops" no longer links to fabricated 404 listings

---

# Phase 1 — Critical security & money integrity

> Goal: no deploy can forge a payment, refund to the wrong place, release undelivered escrow, or lose a CRITICAL audit. Establish the CI gate first conceptually but land it alongside the first tested fix.

### P1-T1 — Stripe webhooks must verify against the raw request body, fail-closed
- **Issues:** `PAY-001` (confirmed), `PAY-014`, `BE-02`, `PAY-009`
- **Objective:** Ensure `/api/v1/payments/webhook*` and `/api/v1/payouts/connect/webhook` receive the unmodified raw body so HMAC signature verification is valid, and that an unsigned webhook is rejected in production.
- **Files affected:** `apps/api/src/main.ts`, `apps/api/src/payments/payments.controller.ts`, `apps/api/src/payouts/payouts.controller.ts`, `apps/api/src/payments/providers/stripe.provider.ts`, `apps/api/src/payments/payments.service.ts`
- **Dependencies:** None (do first). Blocks P1-T8 (webhook tests), P4 refund work.
- **Risk:** High — touches the request-body pipeline for all routes.
- **Implementation steps:**
  1. In `main.ts`, the `rawBody` capture predicate currently matches only `/api/v1/webhooks/`. Broaden it to also match `/api/v1/payments/webhook` and `/api/v1/payouts/connect/webhook` (or switch to `NestFactory.create(AppModule, { rawBody: true })` and read `req.rawBody`). Keep the 1mb cap for webhook routes.
  2. In `stripe.provider.parseWebhook`, verify against `req.rawBody.toString()` only. Remove any `JSON.stringify(req.body)` fallback so a missing raw body fails verification rather than re-serializing.
  3. In `stripe.provider`, change the `else` branch (lines ~193-197) so that when `NODE_ENV==='production'` and `webhookSecret` is empty, it **returns null / throws** instead of "skipping verification". Mirror the Sumsub controller's prod-refusal pattern.
  4. In `payouts.controller.ts` Connect webhook, hard-reject when `NODE_ENV==='production' && !connectWebhookSecret`.
  5. Remove or hard-gate the legacy `/payments/webhook` path that accepts forged mock events (`PAY-009`); never treat "mock" as "has secret".
- **Testing steps:**
  - Unit: post a fixture with a valid `Stripe-Signature` over a known raw body → parsed; tamper one byte of body → rejected.
  - Integration (`PAY-014`): `stripe listen --forward-to /api/v1/payments/webhook/stripe` with `STRIPE_WEBHOOK_SECRET` set, trigger `checkout.session.completed`, assert order → `PAID` and `200 {success:true}`.
  - Prod-mode test: `NODE_ENV=production` with no secret → webhook returns non-2xx, order unchanged.
- **Acceptance criteria:** Real Stripe-signed webhook marks order `PAID`; tampered/unsigned webhook is rejected; in prod, absent secret = fail-closed; no `JSON.stringify(req.body)` path remains.

### P1-T2 — Admin refund must pass currency; mock provider must refuse live refunds in prod
- **Issues:** `PAY-002` (confirmed)
- **Objective:** Stop admin refunds from silently routing to the MOCK provider (faking success) because `currency` is omitted from provider resolution.
- **Files affected:** `apps/api/src/admin/services/admin-order.service.ts`, `apps/api/src/payments/payments.service.ts`, `apps/api/src/payments/providers/mock.provider.ts`
- **Dependencies:** P1-T1 (raw-body), P1-T3 (real PI). Blocks P1-T8, P4-T1.
- **Risk:** High — production refund path.
- **Implementation steps:**
  1. In `admin-order.service.refundOrder`, pass `currency: order.currency` into `processRefund`.
  2. In `payments.service.processRefund`, resolve the provider from `currency`/order, and when the resolved provider is `mock` and `NODE_ENV==='production'`, **throw** instead of returning a fake `success`.
  3. In `mock.provider`, make `refund` throw if invoked in production.
- **Testing steps:** Unit — prod + live order resolves to Stripe provider; prod + mock provider throws; dev still mocks. Add assertion that omitting currency now fails type/lint.
- **Acceptance criteria:** A prod refund cannot complete via the mock provider; admin refund always carries the order currency.

### P1-T3 — Refund against the real captured Stripe payment_intent
- **Issues:** `PAY-003` (confirmed), `BE-04`
- **Objective:** Persist the real `pi_`/`ch_` id from the completed session and refund against it instead of the GETX order id (which Stripe rejects).
- **Files affected:** `apps/api/src/payments/providers/stripe.provider.ts`, `apps/api/src/payments/payments.service.ts`, `apps/api/src/admin/services/admin-order.service.ts`, `packages/database/prisma/schema.prisma` (+ migration)
- **Dependencies:** P1-T1. Blocks P1-T2, P4-T1, P4-T2.
- **Risk:** High — schema migration + payment path.
- **Implementation steps:**
  1. Add `Order.stripePaymentIntentId String?` to the schema; generate a Prisma migration (run against the **direct/non-pooled** URL).
  2. On `checkout.session.completed`, read `data.object.payment_intent` (expand the session if needed) and persist it to `Order.stripePaymentIntentId`. Keep `client_reference_id` only for lookup/idempotency.
  3. In `stripe.provider.refund`, use the stored `payment_intent` as `transactionId`.
  4. Record the Stripe **event id** alongside the order guard so a second distinct completed session for an already-`PAID` order logs a high-severity reconcile alert (`BE-04`).
- **Testing steps:** Integration — complete a Checkout session, assert `stripePaymentIntentId` persisted; issue a refund, assert it targets `pi_...` and Stripe accepts it (test mode).
- **Acceptance criteria:** Live refund succeeds against the real PI; order stores the PI; duplicate completed session raises a reconcile alert, not a silent skip.

### P1-T4 — Escrow auto-release only on DELIVERED orders
- **Issues:** `PAY-004` (confirmed)
- **Objective:** Prevent the escrow cron from auto-paying sellers for orders the seller never marked delivered.
- **Files affected:** `apps/api/src/orders/orders.service.ts`, `apps/api/src/orders/order-escrow.cron.ts`, `apps/api/src/payments/payments.service.ts`
- **Dependencies:** Independent. Pairs with P5-T1 (cron leader election).
- **Risk:** High — automated money movement.
- **Implementation steps:**
  1. Restrict the auto-release query to `status === 'DELIVERED' && deliveredAt != null` past the buyer-confirm SLA.
  2. For `PAID`/`IN_PROGRESS` orders past a longer SLA, route to manual admin review or auto-refund the buyer; never auto-pay the seller for undelivered work.
  3. Combine with `BE-06`: re-check seller status (`ACTIVE`, not banned/suspended) inside `releaseToSeller`'s claim transaction; hold to `pendingEarnings` if unverified/flagged.
- **Testing steps:** Unit — `DELIVERED` past SLA releases; `PAID`/`IN_PROGRESS` past SLA does not release (goes to review/refund); idempotent re-entry on an already-released order is a no-op.
- **Acceptance criteria:** No non-`DELIVERED` order is ever auto-released to a seller; banned/unverified sellers route to `pendingEarnings`.

### P1-T5 — Dispute resolution must actually move buyer money
- **Issues:** `PAY-005` (confirmed)
- **Objective:** Buyer-favoring dispute outcomes must issue a real refund (or wallet credit), not just internal ledger moves.
- **Files affected:** `apps/api/src/admin/services/admin-order.service.ts`
- **Dependencies:** P1-T2, P1-T3 (refund must work first).
- **Risk:** High.
- **Implementation steps:**
  1. For buyer-favoring resolutions where escrow is `HELD`, call `processRefund` (with currency + real PI) — mirror `refundOrder`.
  2. Where escrow is already `RELEASED`, credit the buyer wallet for the principal and apply the seller clawback path.
- **Testing steps:** Integration — resolve a dispute in the buyer's favor; assert buyer funds actually move (refund issued or wallet credited) and the order/escrow state is consistent.
- **Acceptance criteria:** Every buyer-favoring dispute results in actual buyer funds movement, asserted by a test.

### P1-T6 — Admin money-movement CRITICAL audit inside the transaction
- **Issues:** `ARCH-002` (confirmed)
- **Objective:** A failed CRITICAL audit must roll back the money movement (atomicity), matching `orders.service.releaseToSeller`.
- **Files affected:** `apps/api/src/admin/services/admin-order.service.ts`, `apps/api/src/audit/audit.service.ts`
- **Dependencies:** None. Should land with P1-T2/T5.
- **Risk:** Medium.
- **Implementation steps:**
  1. Make `audit.log` accept an optional `tx` Prisma client.
  2. Move the CRITICAL `audit.log` calls for refunds/force-release/dispute payouts inside the wallet `$transaction`, passing the `tx` client.
- **Testing steps:** Unit — force the audit write to throw inside the tx; assert the wallet rows are rolled back (balances unchanged).
- **Acceptance criteria:** A failing CRITICAL audit aborts the money movement; no money row commits without its audit row.

### P1-T7 — CI/CD quality & security gate (required check on `main`)
- **Issues:** `ARCH-001` (confirmed), `INFRA-02` (unverified), `INFRA-08`, `CQ-001`
- **Objective:** Block merges to `main` that fail typecheck, lint, tests, schema validation, or dependency/secret scans.
- **Files affected:** `.github/workflows/ci.yml` (new), `turbo.json`, `package.json`, `apps/api/package.json`
- **Dependencies:** Enables every later phase to ship safely. Land alongside P1-T8.
- **Risk:** Low (additive), but will surface latent failures.
- **Implementation steps:**
  1. Add GitHub Actions workflow on PRs to `main`: `pnpm install --frozen-lockfile`, `turbo typecheck`, `turbo lint`, `turbo test`, `pnpm --filter @getx/database exec prisma validate`.
  2. Add `pnpm audit --audit-level=high` and a secret scanner (gitleaks/trufflehog).
  3. Ensure `turbo.json` defines `typecheck`/`lint`/`test` tasks for every workspace.
  4. Mark the workflow a required status check in branch protection.
- **Testing steps:** Open a PR that intentionally fails typecheck → CI red, merge blocked. Open a clean PR → green.
- **Acceptance criteria:** No PR can merge to `main` with a failing gate; secret scan runs on every PR.

### P1-T8 — Money-path integration tests
- **Issues:** `ARCH-003` (confirmed), `CQ-001`, `PAY-014`
- **Objective:** Cover the real-money logic that currently has zero tests.
- **Files affected:** `apps/api/src/payments/payments.service.spec.ts` (new), `apps/api/src/orders/orders.service.spec.ts` (new), `apps/api/src/wallet/wallet.service.spec.ts` (new), `apps/api/src/auth/auth.service.spec.ts` (new), `apps/api/test/*.e2e-spec.ts`
- **Dependencies:** P1-T1..T6 (tests assert their behaviors), P1-T7 (runs them).
- **Risk:** Low.
- **Implementation steps:** Add Jest tests for: `processCheckoutCompleted` amount/currency mismatch rejection; `releaseToSeller` idempotent re-entry; refund clawback on `RELEASED` escrow; withdraw daily-cap; refresh-token theft family revocation; webhook signature/rawBody (real signed fixture).
- **Testing steps:** `turbo test` green locally and in CI.
- **Acceptance criteria:** Each listed scenario has a passing test wired into the CI gate.

### P1-T9 — Production boot fail-fast for payment/KYC/storage secrets; mock off in prod
- **Issues:** `INFRA-05`, `ARCH-006`, `INFRA-09` (`/health/deep`), `INFRA-01` [^f2]
- **Objective:** Refuse to boot in prod without the secrets needed for safe money/KYC operation.
- **Files affected:** `apps/api/src/main.ts`, `apps/api/src/payments/payments.service.ts`, `apps/api/src/health/health.controller.ts`
- **Dependencies:** P1-T1 (defines the webhook-secret requirement).
- **Risk:** Medium — a wrong check blocks deploy (which is the intent).
- **Implementation steps:**
  1. Extend the existing prod `required` block in `main.ts` to require, **when a live Stripe key is present**: `STRIPE_WEBHOOK_SECRET` (+ `STRIPE_CONNECT_WEBHOOK_SECRET` when Connect is used), Sumsub credentials, and R2 storage keys.
  2. Assert `PAYMENTS_ENABLE_MOCK` is off in prod.
  3. In prod, require `HEALTH_TOKEN` for `/health/deep` (return 403 when unset) instead of failing open (`INFRA-09`).
- **Testing steps:** Boot with `NODE_ENV=production` and a live key but no webhook secret → process exits 1. With all secrets → boots.
- **Acceptance criteria:** Prod cannot boot mock-enabled or without payment/KYC/storage secrets; deep health is gated.

---

# Phase 2 — Authentication & authorization

> Goal: identity and high-impact action surfaces are hardened before functionality is re-enabled.

### P2-T1 — OAuth `state` parameter (login CSRF / session fixation)
- **Issues:** `AUTH-001` (confirmed)
- **Objective:** Bind the OAuth round-trip to the initiating session and reject mismatched callbacks.
- **Files affected:** `apps/api/src/auth/strategies/google.strategy.ts`, `apps/api/src/auth/strategies/discord.strategy.ts`, `apps/api/src/auth/auth.controller.ts`
- **Dependencies:** None.
- **Risk:** Medium — OAuth regressions are user-visible.
- **Implementation steps:** Use a stateless signed-state nonce stored in a short-lived httpOnly cookie at the start route; verify it in the callback (or `state: true` with a session store). Reject on mismatch.
- **Testing steps:** Manual — tamper/remove `state` on callback → rejected; valid flow → success. Add a unit test for nonce verify.
- **Acceptance criteria:** Callbacks without a matching signed `state` are refused on both providers.

### P2-T2 — OAuth auto-link only on provider-verified email
- **Issues:** `AUTH-004` (confirmed), `AUTH-005`
- **Objective:** Prevent account takeover by silent email-based linking when the provider hasn't verified the email.
- **Files affected:** `apps/api/src/auth/strategies/discord.strategy.ts`, `apps/api/src/auth/auth.service.ts`, `packages/database/prisma/schema.prisma`
- **Dependencies:** None.
- **Risk:** Medium.
- **Implementation steps:**
  1. For Discord, require `profile.verified === true` before auto-link; reject otherwise.
  2. For any provider, prefer requiring the existing owner to confirm linking from an authenticated session over silent auto-link.
  3. `AUTH-005`: encrypt stored provider access/refresh tokens with the existing `encryptPii` helper (or stop storing them).
- **Testing steps:** Unit — unverified Discord email does not link to an existing account; verified does. Assert stored tokens are ciphertext.
- **Acceptance criteria:** No silent link on unverified provider email; provider tokens encrypted at rest.

### P2-T3 — Throttler backed by Redis across replicas (consolidated)
- **Issues:** `ARCH-004` (confirmed), `PERF-001`, `AUTH-006`, `APPSEC-004`, `INFRA-04`, `INFRA-03`, `FUNC-009`, `PAY-013`, `BE-01` (all the same root cause)
- **Objective:** Make IP/login/checkout/withdraw rate limits enforceable across replicas using the existing `getRedisClient()` singleton.
- **Files affected:** `apps/api/src/app.module.ts`, `apps/api/src/auth/auth.module.ts`, `apps/api/src/common/redis.factory.ts`, `apps/api/src/conversations/socket-rate-limiter.ts`
- **Dependencies:** Coordinates with P5-T1 (Redis as hard prod dep).
- **Risk:** Medium.
- **Implementation steps:**
  1. Add `@nest-lab/throttler-storage-redis` (or `@nestjs/throttler-storage-redis`); pass `storage: new ThrottlerStorageRedisService(getRedisClient())` to `ThrottlerModule.forRoot` when `REDIS_URL` is present (`app.module.ts:53` is the documented swap point). Keep in-memory fallback for single-replica dev.
  2. Back `SocketRateLimiter` with Redis `INCR`+`EXPIRE`.
  3. Add `@Throttle` to OAuth callback handlers, e.g. 20/min/IP (`AUTH-002`).
- **Testing steps:** With two API replicas + Redis, exceed the login limit across replicas → blocked globally. Without Redis (dev) → in-memory still works.
- **Acceptance criteria:** Throttle counters are shared across replicas when Redis is set; OAuth callbacks are throttled.

### P2-T4 — Policy/ability authorization layer + WS ticket
- **Issues:** `ARCH-009`, `AUTH-011` (WS token exposure), `APPSEC-003`/`INFRA-11` (no-Origin WS), `AUTH-002`
- **Objective:** Centralize resource-ownership enforcement and reduce per-method discipline; reduce WS token blast radius.
- **Files affected:** `apps/api/src/auth/guards/roles.guard.ts`, `apps/api/src/orders/orders.service.ts`, `apps/api/src/auth/auth.controller.ts`, `apps/api/src/conversations/chat.gateway.ts`
- **Dependencies:** P2-T3.
- **Risk:** Medium — refactor of authorization.
- **Implementation steps:**
  1. Introduce a `PolicyGuard` + `@CheckOwnership` decorator (or CASL) so ownership is declared at the route.
  2. Replace `GET /auth/ws-token`'s full-access-token return with a short-lived (~60s) `ws`-audience ticket.
  3. Runtime-test the no-Origin WS handshake; if mobile webviews are not a target, reject no-Origin connections (`APPSEC-003`).
- **Testing steps:** Unit — non-owner is denied via the guard; WS ticket expires in ~60s; no-Origin handshake outcome matches policy.
- **Acceptance criteria:** Ownership is enforced declaratively at routes; WS uses a scoped ticket, not the access token.

### P2-T5 — Step-up auth for CRITICAL admin money actions
- **Issues:** `AUTH-008`, `AUTH-010` (2FA), `AUTH-003` (refresh TTL), `AUTH-007`
- **Objective:** Require re-authentication for the CRITICAL-severity admin actions the audit layer already marks.
- **Files affected:** `apps/api/src/admin/admin.controller.ts`, `apps/api/src/admin/services/admin-user.service.ts`, `apps/api/src/admin/services/admin-finance.service.ts`, `apps/api/src/auth/auth.service.ts`
- **Dependencies:** P2-T1..T4.
- **Risk:** Medium.
- **Implementation steps:**
  1. Require step-up (password re-entry or TOTP) with a short validity window for CRITICAL admin actions; reuse the CRITICAL audit set as the step-up boundary.
  2. Implement TOTP enrollment/verification (`AUTH-010`); store the secret encrypted via `UserPii`.
  3. `AUTH-003`: persist intended session max lifetime (`rememberMe`/absolute-expiry) and preserve it across refresh rotations instead of resetting to 7 days (current code at `auth.service.ts:397-398` resets TTL on each rotation).
  4. `AUTH-007`: remove or document the unused `JWT_REFRESH_SECRET` requirement.
- **Testing steps:** Unit — CRITICAL admin action without a fresh step-up token is rejected; TOTP verify path works; refresh rotation preserves original TTL.
- **Acceptance criteria:** CRITICAL admin money actions require step-up; TOTP is functional; refresh TTL honors `rememberMe`.

---

# Phase 3 — Broken functionality (login/signup → seller dashboard → seller buttons first)

> Goal: restore the happy paths in revenue order. These are the highest-impact "nothing works" items.

### P3-T1 — Login/signup works; OTP email is a prod requirement or clearly mocked
- **Issues:** `FLOW-001` (Critical), `FUNC-008` (copy)
- **Objective:** Login is refused until email is verified, but OTP mail silently degrades to console-log when Resend is unconfigured — so no one can verify and log in.
- **Files affected:** `apps/api/src/auth/auth.service.ts`, `apps/api/src/mail/mail.service.ts`, `apps/api/src/main.ts`, `apps/web/src/app/auth/login/page.tsx`, `apps/web/src/app/auth/verify-email/page.tsx`
- **Dependencies:** P1-T9 (boot fail-fast pattern).
- **Risk:** Medium.
- **Implementation steps:**
  1. Treat `RESEND_API_KEY` (or an explicit `DEV_EMAIL_CONSOLE` flag) as a prod boot requirement in `main.ts`; show a non-prod banner when mail is mocked.
  2. Differentiate the login error for unverified accounts (e.g. "Please verify your email — resend code") instead of the generic message; the audit already records the real reason at `auth.service.ts:373-382`. Keep the generic message for locked/banned to avoid enumeration.
  3. `FUNC-008`: make the soft-launch geo rejection message generic or interpolate the env allowlist.
- **Testing steps:** Manual — register → receive OTP via Resend → verify → login. Prod boot without `RESEND_API_KEY` and without `DEV_EMAIL_CONSOLE` exits 1.
- **Acceptance criteria:** A new user can register, verify, and log in in prod; unverified users get an actionable error; no silent console-only OTP in prod.

### P3-T2 — Frontend env templates: same-origin `/api/v1` proxy + `getx.live`
- **Issues:** `FUNC-001` (confirmed), `FLOW-002`, `FLOW-006`, `FLOW-007`, `FUNC-005` (confirmed), `INFRA-06`, `FE-001` (localhost fallback)
- **Objective:** Stop the absolute cross-origin `NEXT_PUBLIC_API_URL` from defeating the same-origin proxy that the cookie architecture depends on (re-breaks Safari/iOS), and converge the domain on `getx.live`.
- **Files affected:** `apps/web/.env.example`, `apps/web/.env.production.example`, `apps/seller/.env.example`, `apps/seller/.env.production.example`, `apps/admin/.env.production.example`, `apps/web/next.config.mjs`, `apps/web/src/lib/api.ts`, `apps/seller/src/middleware.ts`, `apps/admin/src/middleware.ts`
- **Dependencies:** Land before P3-T3 (seller dashboard depends on the proxy).
- **Risk:** Medium — env changes affect every deployment.
- **Implementation steps:**
  1. Set `NEXT_PUBLIC_API_URL=/api/v1` and `API_UPSTREAM_URL=https://api.getx.live` in all three frontend templates (match commit `0b54a2d`). Add `NEXT_PUBLIC_API_DIRECT_URL=https://api.getx.live` for the chat WebSocket.
  2. Replace every `getx.gg` with `getx.live` across `.env*.example` and CSP/image `remotePatterns`; ideally derive the CSP allowlist from `NEXT_PUBLIC_API_URL` host (`INFRA-06`).
  3. `FLOW-007`: fix `apps/seller/.env.example` to include the `/api/v1` suffix (or rely on the same-origin rewrite); add a comment that the value must include `/api/v1` unless proxied.
  4. `FE-001`: make `API_UPSTREAM_URL` required at build/boot for seller+admin middleware — throw in prod instead of falling back to `localhost:4000`.
  5. Add a warning comment in `.env.production.example` that an absolute `NEXT_PUBLIC_API_URL` breaks Safari cookies.
- **Testing steps:** Build each app with the templated env; confirm requests go to `/api/v1` (same origin), the rewrite proxies to `api.getx.live`, and Safari retains the session cookie. Confirm CSP `connect-src` matches the final host.
- **Acceptance criteria:** All three apps use the same-origin proxy; no `getx.gg` remains; no localhost fallback in prod; Safari/iOS login persists.

### P3-T3 — Seller dashboard opens; "Become a seller" button works
- **Issues:** `FUNC-003` (confirmed, HTTP 415), `FE-001`, `FE-002`, `FE-003`/`FUNC-007` (redirect), `FUNC-006` (KYC gate on first listing)
- **Objective:** The seller dashboard must open and the activation button must succeed.
- **Files affected:** `apps/seller/src/components/seller-guard.tsx`, `apps/seller/src/lib/api.ts`, `apps/seller/src/middleware.ts`, `apps/api/src/listings/listings.service.ts`
- **Dependencies:** P3-T2 (proxy/cookie templates), and the API CSRF middleware that returns 415 for non-JSON POSTs (`main.ts:102-115`, confirmed present).
- **Risk:** Medium.
- **Implementation steps:**
  1. `FUNC-003`: the native `fetch` in `seller-guard.tsx` omits `Content-Type: application/json` and gets a 415 from the JSON-only middleware. Either add `headers: { 'Content-Type': 'application/json' }` (+ empty JSON body) or replace it with the existing `api.patch('/auth/me/activate-seller')` axios call.
  2. `FE-003`/`FUNC-007`: change the seller axios refresh-failure redirect from the non-existent same-origin `/auth/login` to `${NEXT_PUBLIC_WEB_URL}/auth/login?next=<absolute seller URL>`.
  3. `FUNC-006`: after `activateSeller`, surface a "Start identity verification" CTA, or allow a `DRAFT` (unpublished) listing pre-KYC and require KYC only to publish; at minimum make the 400 link to the KYC flow.
- **Testing steps:** Manual — log in on web, open `sell.getx.live`, click "Become a seller" → 200, dashboard renders; refresh-failure redirects to web login with `next`; new seller sees a KYC CTA, not a dead-end 400.
- **Acceptance criteria:** Activation returns 200; dashboard opens for a logged-in user; refresh failure routes to web login; first-listing flow guides to KYC.

### P3-T4 — Homepage seller CTAs route correctly (no localhost fallback)
- **Issues:** `FUNC-004` (confirmed), `FLOW-005`, `FE-006`, `FE-007`
- **Objective:** "Sell on GETX"/"Start selling" must not fall back to `http://localhost:3001`.
- **Files affected:** `apps/web/src/components/header.tsx`, `apps/web/src/components/landing/for-sellers.tsx`, `apps/web/next.config.mjs`
- **Dependencies:** P3-T2.
- **Risk:** Low.
- **Implementation steps:**
  1. Unify all CTAs into one helper. Prefer routing through the same-origin redirect (`next.config.mjs` maps `/sell` → seller origin) so a missing env degrades to a working server-side redirect, not localhost.
  2. Replace both hardcoded `http://localhost:3001` fallbacks with `NEXT_PUBLIC_SELLER_URL || '/sellers/program'` and guarantee `NEXT_PUBLIC_SELLER_URL` in the web build env.
  3. `FE-006`: drive the login open-redirect `TRUSTED_BASE_DOMAINS` from an env var / include all prod apexes.
  4. `FE-007`: after email verification, if interest is `SELLER`/`BOTH`, deep-link to the seller app (auto-activate).
- **Testing steps:** Build web without `NEXT_PUBLIC_SELLER_URL` → CTA still resolves to a working redirect; with it set → goes to seller origin.
- **Acceptance criteria:** No localhost link in any seller CTA; missing env degrades gracefully; `SELLER`/`BOTH` registrants land in the seller app.

### P3-T5 — KYC verification UI (Sumsub widget) or admin manual-verify
- **Issues:** `FLOW-004` (Critical), `FLOW-010` (deep-link), `FUNC-006`
- **Objective:** Without a working KYC surface, `kycStatus` can never reach `VERIFIED` and withdrawals are permanently blocked.
- **Files affected:** `apps/web/src/app/profile/settings/kyc/page.tsx`, `apps/seller/src/app/profile/page.tsx`, `apps/seller/src/app/wallet/page.tsx`, `apps/api/src/admin/admin.controller.ts`, `apps/api/src/wallet/wallet.service.ts`
- **Dependencies:** P1-T9 (Sumsub secrets validated), P3-T3.
- **Risk:** Medium — third-party widget + KYC state transitions.
- **Implementation steps:**
  1. Install `@sumsub/websdk-react`; mount the widget with the fetched access token on the KYC page.
  2. As an interim manual path, add an admin "mark KYC verified" endpoint + admin UI (review-driven) so launch is not blocked on the widget.
  3. `FLOW-010`: deep-link the wallet "Start KYC" step directly to the verification surface (`/profile#kyc` or a dedicated route).
- **Testing steps:** Manual — complete the Sumsub sandbox flow → webhook flips `kycStatus` to `VERIFIED`; admin manual-verify also flips it. Verify a verified seller can then proceed to withdraw.
- **Acceptance criteria:** A seller can reach `VERIFIED` via the widget or admin action; the wallet KYC step deep-links in one click.

### P3-T6 — Checkout: document the flag, flip it, capture intent when off
- **Issues:** `FLOW-003` (Critical)
- **Objective:** The entire buyer checkout is disabled by default by an undocumented flag.
- **Files affected:** `apps/web/src/lib/feature-flags.ts`, `apps/web/src/components/listings/checkout-drawer.tsx`, the three `games/pokemon-go/{accounts,top-ups,items}/[slug]/page.tsx`, `apps/web/src/app/orders/[id]/page.tsx`, all web `.env*.example`
- **Dependencies:** P3-T2; P4 (payment reliability) should be green before flipping in prod.
- **Risk:** Medium — flipping this enables real charges.
- **Implementation steps:**
  1. Document `NEXT_PUBLIC_CHECKOUT_DISABLED` in all web env templates with its launch meaning.
  2. When Stripe is live and P4 is green, set `NEXT_PUBLIC_CHECKOUT_DISABLED=false` and verify the order → checkout → Stripe → `/orders/[id]?payment=success` loop.
  3. Until then, replace the bare toast with a real "notify me at launch" capture so intent is not lost.
- **Testing steps:** With the flag off, run a full test-mode checkout to success. With it on, the CTA captures an email instead of a dead toast.
- **Acceptance criteria:** Flag is documented; with it off the full loop works; with it on intent is captured.

### P3-T7 — Withdrawals gate + admin Withdrawals review screen
- **Issues:** `FLOW-008` (gate), `FLOW-009` (admin screen), `FLOW-011`/`FUNC-010` (admin login role check), `FE-005`
- **Objective:** Even a fully set-up seller cannot cash out (undocumented `NEXT_PUBLIC_PAYOUTS_LIVE`), and admins have no screen to action manual payouts.
- **Files affected:** `apps/seller/src/app/wallet/page.tsx`, `apps/seller/src/hooks/use-wallet.ts`, `apps/admin/src/components/admin-shell.tsx`, `apps/admin/src/app/auth/login/page.tsx`, `apps/api/src/admin/admin.controller.ts`
- **Dependencies:** P3-T5 (KYC), P2-T5 (step-up for payout actions).
- **Risk:** Medium — enables real payouts.
- **Implementation steps:**
  1. Document `NEXT_PUBLIC_PAYOUTS_LIVE`; align its flip with KYC (P3-T5) and checkout (P3-T6). When enabled, wire `handleWithdrawClick` to the existing `useWithdraw` mutation.
  2. Add a Withdrawals nav item + page to the admin app consuming the existing approve/reject endpoints.
  3. `FLOW-011`/`FUNC-010`: after admin login, refetch and check `role ∈ {ADMIN, SUPER_ADMIN}` before `router.push`; show "admin role required" inline otherwise; validate the `next` redirect (mirror web's `safeNext`/`isTrustedOrigin`).
- **Testing steps:** Verified seller withdraws → request created; admin approves/rejects from the new screen; non-admin login shows the inline error (no redirect loop).
- **Acceptance criteria:** The three gates (KYC/checkout/payouts) flip together; admins can action withdrawals; non-admins get a clear message.

---

# Phase 4 — Payment reliability (now that the flow is reachable)

> Goal: the lifecycle that Phase 3 re-enabled is correct under edge cases — partial refunds, idempotency, decimal math, reward durability.

### P4-T1 — Idempotency keys on every money event
- **Issues:** `PAY-007`, `PAY-006` (cashback)
- **Objective:** Populate the unused `WalletTransaction.idempotencyKey` so the DB rejects duplicates independent of upstream guards.
- **Files affected:** `apps/api/src/wallet/wallet.service.ts`, `apps/api/src/orders/orders.service.ts`, `apps/api/src/payments/payments.service.ts`, `apps/api/src/orders/listeners/order-wallet.listener.ts`
- **Dependencies:** P1 complete.
- **Risk:** Medium.
- **Implementation steps:**
  1. Set deterministic keys: `release:<orderId>`, `withdraw:<withdrawalId>`, `cashback:<orderId>`.
  2. `PAY-006`: wrap the three cashback writes in `$transaction` with `idempotencyKey='cashback:'+orderId`.
- **Testing steps:** Unit — replaying the same money event twice creates exactly one row (unique-constraint rejection).
- **Acceptance criteria:** Every release/withdraw/cashback carries a unique idempotency key; duplicates are DB-rejected.

### P4-T2 — Partial-refund seller clawback + refund cap accounting
- **Issues:** `PAY-008`, `PAY-010`, `PAY-011`/`BE-07` (dispute number race)
- **Objective:** Consistent partial-refund treatment and a correct refundable cap.
- **Files affected:** `apps/api/src/payments/payments.service.ts`, `apps/api/src/admin/services/admin-order.service.ts`, `apps/api/src/orders/orders.service.ts`
- **Dependencies:** P1-T2/T3, P4-T1.
- **Risk:** Medium.
- **Implementation steps:**
  1. Apply proportional seller clawback (clamped to `sellerAmount`) on partial refunds, identically in the webhook handler and admin paths.
  2. Cap refundable to `buyerTotal − walletApplied − loyaltyUsdApplied − alreadyRefunded`; track cumulative `refundedAmount` on the order.
  3. Replace `count()+1` dispute numbering with a `randomBytes`-based year-scoped suffix.
- **Testing steps:** Unit — partial refund claws back the proportional seller amount; cap rejects over-refund; concurrent dispute creation produces unique numbers.
- **Acceptance criteria:** Partial refunds are consistent across paths; over-refund is impossible; dispute numbers never collide.

### P4-T3 — Durable reward side-effects (outbox) + decimal money math
- **Issues:** `BE-03`, `BE-05`, `BE-08` (webhook error swallowing)
- **Objective:** Stop silent reward loss from out-of-transaction listeners and float accumulation error on the ledger.
- **Files affected:** `apps/api/src/orders/orders.service.ts`, `apps/api/src/orders/listeners/order-wallet.listener.ts`, `apps/api/src/wallet/wallet.service.ts`, `apps/api/src/webhooks/sumsub.controller.ts`, `apps/api/src/payouts/payouts.controller.ts`
- **Dependencies:** P4-T1.
- **Risk:** Medium.
- **Implementation steps:**
  1. Persist a durable outbox row (or `processed` flag on the order) for reward side-effects; retry failures via a sweeper cron keyed by `orderId`.
  2. Do money math with `Prisma.Decimal`; replace silent `Math.max(0,...)` clamps with an explicit negative-balance audit/alert.
  3. `BE-08`: move the idempotency-row insert inside the same transaction as the state mutation (match `PaymentsService.dispatchEvent`), or return non-2xx so the provider retries.
- **Testing steps:** Unit — force a reward listener to throw → sweeper re-credits exactly once; decimal accumulation matches expected to the cent; failed webhook processing returns non-2xx.
- **Acceptance criteria:** No reward is silently lost; ledger math is decimal-exact; webhook failures retry.

### P4-T4 — Mock-path parity + dev mock-checkout form
- **Issues:** `ARCH-014`, `ARCH-015`, `ARCH-013` (SDK eval), `PAY-012` (no-op)
- **Objective:** Make the mock path exercise the same verification as real Stripe and fix the dev mock-checkout form.
- **Files affected:** `apps/api/src/payments/payments.service.ts`, `apps/api/src/payments/providers/stripe.provider.ts`, `apps/api/src/payments/payments.controller.ts`
- **Dependencies:** P1-T1.
- **Risk:** Low (dev-only surface).
- **Implementation steps:**
  1. `ARCH-014`: set `amount: order.buyerTotal.toNumber()` (dollars) in `simulateMockPayment` so it hits the identical dollar-typed verification (the real path divides minor units by 100 in `stripe.provider.ts:254`).
  2. `ARCH-015`: convert the dev mock-checkout form to a `fetch()` POST with `Content-Type: application/json` (the JSON-only middleware otherwise rejects it), or exempt the dev-only route.
  3. `ARCH-013`: evaluate adopting the official `stripe-node` SDK for signature verification + Checkout creation behind the existing `PaymentProvider` interface (mock path unaffected). Optional; keep current hand-rolled HMAC if the test suite covers it.
- **Testing steps:** Dev — mock checkout submits successfully and the order goes `PAID` through the same code path as a real webhook.
- **Acceptance criteria:** Mock path is byte-for-byte equivalent to the real verification; dev form posts JSON successfully.

---

# Phase 5 — Performance & scalability

> Goal: remove the per-replica correctness cliffs and the hot-path DB pressure before scaling beyond one replica.

### P5-T1 — Redis as a hard prod dependency: throttler, cron leader-election, socket adapter
- **Issues:** `PERF-012` (cron duplication), `ARCH-005`/`ARCH-004`, `PERF-007` (lastSeen map)
- **Objective:** Prevent duplicate cron execution, single-replica realtime, and unbounded fallback maps when scaling.
- **Files affected:** `apps/api/src/main.ts`, `apps/api/src/app.module.ts`, `apps/api/src/orders/order-escrow.cron.ts`, `apps/api/src/account/account-anonymize.cron.ts`, `apps/api/src/saved-searches/saved-searches.service.ts`, `apps/api/src/conversations/chat.gateway.ts`, `apps/api/src/auth/strategies/jwt.strategy.ts`
- **Dependencies:** P2-T3 (Redis throttler).
- **Risk:** High — affects deploy topology.
- **Implementation steps:**
  1. Make `REDIS_URL` required in prod boot validation when replicas > 1 (or always in prod); fail closed otherwise.
  2. Gate every cron behind a Redis `SET NX EX` distributed lock (or run the scheduler in a single dedicated worker replica).
  3. Confirm the Socket.IO Redis adapter is wired when `REDIS_URL` is set.
  4. Bound the `lastSeen` fallback Map (LRU/periodic sweep) for the no-Redis path.
- **Testing steps:** Run two API replicas; confirm a cron fires exactly once per tick; confirm chat works across replicas; load the in-memory fallback and confirm it is bounded.
- **Acceptance criteria:** Multi-replica prod runs each cron once, shares realtime, and cannot run without Redis.

### P5-T2 — Per-request user-read cache
- **Issues:** `PERF-002`
- **Objective:** Remove ~1 DB read per authenticated request.
- **Files affected:** `apps/api/src/auth/strategies/jwt.strategy.ts`, `apps/api/src/admin/services/admin-user.service.ts`
- **Dependencies:** P5-T1.
- **Risk:** Medium — staleness on ban/password change.
- **Implementation steps:** Cache the projected user row in Redis (or in-process LRU, ≤30s TTL) keyed by `sub`; invalidate on ban/unban, password change (`passwordChangedAt`), and status transitions; DB stays source of truth on miss.
- **Testing steps:** Bench RPS before/after; assert a ban invalidates within the TTL window.
- **Acceptance criteria:** Authenticated requests no longer issue a full user read on cache hit; ban/password change invalidate promptly.

### P5-T3 — Cursor pagination on hot list paths
- **Issues:** `PERF-009`, `PERF-005`, `ARCH-011`, `DATA-003` (FK indexes), `PERF-008` (JSONB GIN)
- **Objective:** Replace OFFSET deep-page scans and silent `take:100` truncation with keyset pagination.
- **Files affected:** `apps/api/src/listings/listings.service.ts`, `apps/api/src/orders/orders.service.ts`, `apps/api/src/conversations/conversations.service.ts`, `apps/api/src/custom-requests/custom-requests.service.ts`, `apps/api/src/wallet/wallet.service.ts`, `apps/api/src/admin/services/admin-content.service.ts`, `packages/database/prisma/schema.prisma` (+ migrations)
- **Dependencies:** None hard; pairs with DATA tasks in P7.
- **Risk:** Medium — API contract change for list endpoints.
- **Implementation steps:**
  1. Adopt the proven `getMyListings` keyset pattern (`createdAt,id` or `price,id`) for browse, `listMyOrders`, conversations, custom requests, wallet, and admin lists. Window/cache the total count.
  2. Move dashboard stat aggregation server-side (`count`/`aggregate`) instead of summing a truncated client array.
  3. Add `gin (attributes jsonb_path_ops)` for ACCOUNTS facets (or promote hot numeric attrs to real indexed columns); add `@@index([productListingId])` on Order and `@@index([orderId])` on Review.
- **Testing steps:** Deep-page a large list → constant-time response; assert no silent truncation; `EXPLAIN` shows index usage on facet filters.
- **Acceptance criteria:** Hot lists are cursor-paginated; deep pages are O(1); facet filters are indexed.

### P5-T4 — Caching for heavy aggregates & immutable reads
- **Issues:** `PERF-004` (dashboard), `PERF-006` (games/leaderboard/listing detail), `PERF-013` (CDN), `PERF-003` (pool sizing), `PERF-011` (RSC browse), `PERF-010` (transpilePackages)
- **Objective:** Stop recomputing full-table GMV aggregates every 60s and absorb immutable reads.
- **Files affected:** `apps/api/src/admin/services/admin-dashboard.service.ts`, `apps/admin/src/hooks/use-admin.ts`, `apps/api/src/games/games.service.ts`, `apps/api/src/users/users.service.ts`, `apps/api/src/listings/listings.service.ts`, `apps/web/next.config.mjs`, `apps/{web,seller,admin}/next.config.mjs`
- **Dependencies:** P5-T1 (Redis).
- **Risk:** Medium.
- **Implementation steps:**
  1. Cache the dashboard payload in Redis (~30-60s TTL) or precompute GMV/revenue/pendingPayouts into a summary table via cron; drop the unconditional poll to manual-refresh + cache read.
  2. Short-TTL Redis cache for `listGames`, `getGameBySlug`, `getLeaderboard`, listing detail; invalidate on admin game edits / rank cron.
  3. Add `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` on genuinely public GETs; keep authed endpoints `no-store`.
  4. Move the initial browse fetch into an RSC/route handler; hydrate TanStack Query from the server payload.
  5. `PERF-010`: remove `@getx/database` from frontend `transpilePackages` (consume `@getx/types` only). `PERF-003`: load-test pool sizing per replica.
- **Testing steps:** Confirm dashboard reads hit cache; confirm public GETs carry cache headers; confirm Prisma runtime is unreachable from client bundles.
- **Acceptance criteria:** Dashboard aggregates are cached; immutable reads are CDN/Redis-absorbable; browse first paint is server-rendered.

---

# Phase 6 — UI/UX, accessibility & dashboard security headers

> Goal: trust, accessibility, and CSP correctness on every surface.

### P6-T1 — Remove fabricated content that links to 404s
- **Issues:** `UIUX-001` (Critical), `UIUX-007`, `UIUX-009`
- **Objective:** The homepage "Featured drops" grid is fabricated and links to 404s.
- **Files affected:** `apps/web/src/components/landing/hero-section.tsx`, `apps/web/src/components/header.tsx`, `apps/web/src/app/how-it-works/page.tsx`
- **Dependencies:** None.
- **Risk:** Low.
- **Implementation steps:**
  1. Drive "Featured drops" from real listings (reuse `useListings`/a featured endpoint). If no live inventory, show category tiles or a coming-soon state; at minimum make cards non-linking until backed by real data.
  2. Replace "Join thousands" social proof with launch-honest copy; drive header "trending searches" from real popular queries or relabel to "Popular categories".
- **Testing steps:** Click every homepage card → no 404; assert cards are data-backed or non-linking.
- **Acceptance criteria:** No phantom listing links anywhere on the landing surface.

### P6-T2 — CSP on admin and seller apps (consolidated)
- **Issues:** `UIUX-011`, `APPSEC-001`, `INFRA-03`, `INFRA-04`, `FE-004`, `ARCH-006` (CSP half)
- **Objective:** Admin and seller ship no CSP today.
- **Files affected:** `apps/admin/next.config.mjs`, `apps/seller/next.config.mjs`, `apps/web/next.config.mjs` (reference)
- **Dependencies:** P3-T2 (final API origin known).
- **Risk:** Medium — a too-strict CSP can break the app.
- **Implementation steps:** Port the web CSP into admin + seller `headers()`: `frame-ancestors 'none'`, `object-src 'none'`, `connect-src 'self'` + each app's API/WS origin; drop buyer-only allowances (Crisp, Pexels). As same-origin-proxied SPAs, `connect-src 'self'` is largely sufficient. Consider a shared header factory in `packages/utils`. Avoid `unsafe-inline`/`unsafe-eval` in `script-src` where Next allows.
- **Testing steps:** Load both dashboards with devtools open; zero CSP violations; confirm headers present.
- **Acceptance criteria:** Admin + seller serve a strict CSP with no functional regression.

### P6-T3 — Accessibility: skip links, main landmarks, announced errors, focus, motion classes
- **Issues:** `UIUX-002`, `UIUX-003`, `UIUX-004`, `UIUX-008`, `UIUX-012`, `UIUX-013`, `UIUX-014`
- **Objective:** Fix the broken skip link, missing landmarks, undefined motion classes, unannounced errors, and faint focus rings.
- **Files affected:** `apps/web/src/app/layout.tsx`, `apps/admin/src/components/admin-shell.tsx`, `apps/seller/src/app/page.tsx`, `packages/ui/tailwind.config.ts`, `packages/ui/src/components/input.tsx`, `apps/admin/src/app/users/page.tsx`
- **Dependencies:** None.
- **Risk:** Low.
- **Implementation steps:**
  1. Centralize `<main id="main">` in shared layout/shell so the skip target can never be omitted (web, admin, seller). Add a visually-hidden skip link as the first focusable element in admin + seller.
  2. Define `transitionDuration.ui` (200ms) and `transitionTimingFunction.apple` (`cubic-bezier(.22,1,.36,1)`) in `packages/ui/tailwind.config.ts` so `duration-ui`/`ease-apple` resolve.
  3. Add `role="alert"`/`aria-live="polite"` to the Input error paragraph.
  4. Use `ring-2 ring-ring` focus on admin/seller filter inputs (≥3:1 contrast); add `aria-hidden` to decorative emoji with a real text label; consider semantic `<table>` for the densest admin views.
- **Testing steps:** Keyboard-tab to the skip link on every page; axe/Lighthouse a11y pass; screen reader announces a new validation error.
- **Acceptance criteria:** Skip link works on all pages; motion classes resolve; errors are announced; focus rings meet contrast.

### P6-T4 — UI consistency & global positioning correctness
- **Issues:** `UIUX-005` (dead admin search), `UIUX-006` (UPI vs global), `UIUX-010` (CTA consistency), `APPSEC-002`/`APPSEC-005` (URL/XSS)
- **Objective:** Remove the non-functional admin search, reconcile India-specific UPI copy with the global USD-primary stance, unify CTA styling, and close minor XSS surfaces.
- **Files affected:** `apps/admin/src/components/admin-shell.tsx`, `apps/web/src/app/how-it-works/page.tsx`, `apps/web/src/app/profile/wallet/page.tsx`, `apps/web/src/app/profile/payouts/page.tsx`, `apps/web/src/components/landing/buyer-faq.tsx`, `packages/ui/src/components/button.tsx`, `apps/api/src/account/dto/account.dto.ts`, `apps/web/src/app/layout.tsx`, `apps/web/src/components/support/crisp-chat.tsx`
- **Dependencies:** None.
- **Risk:** Low.
- **Implementation steps:**
  1. Wire the admin header search to a real federated search or remove it.
  2. Present Stripe/PayPal/Wise as primary; demote UPI to a region-gated INR-only option; remove "Withdraw to UPI" from generic global copy (aligns with the documented global-pivot memory).
  3. Consolidate the primary CTA into a single gradient-pill `Button` variant with the locked CTA verbs.
  4. `APPSEC-002`: use `safeHttpUrl()` for the `website` profile field. `APPSEC-005`: extract a shared `serializeJsonLd()` with `<,>,&` escaping for all `dangerouslySetInnerHTML` JSON-LD.
- **Testing steps:** Admin search is functional or absent; INR-only sees UPI, others don't; `javascript:`/`data:` website URLs rejected; JSON-LD with `<` renders escaped.
- **Acceptance criteria:** No decorative-but-interactive controls; payout copy matches global stance; one CTA language; URL/XSS surfaces closed.

---

# Phase 7 — Code quality, data model & tooling

> Goal: lock in long-term maintainability and remove latent data-integrity debt.

### P7-T1 — Strict TypeScript + lint hardening
- **Issues:** `CQ-004`, `CQ-007`, `CQ-008`
- **Objective:** Turn on full strict mode and re-enable `no-explicit-any` for the most sensitive app.
- **Files affected:** `apps/api/tsconfig.json`, `apps/api/eslint.config.mjs`, `tsconfig.json`, `apps/api/src/admin/services/admin-finance.service.ts`
- **Dependencies:** P1-T7 (CI enforces it).
- **Risk:** Medium — may surface type errors to fix.
- **Implementation steps:** Set `strict: true` (+ `noUncheckedIndexedAccess`, `noImplicitReturns`) in the API tsconfig; flip `@typescript-eslint/no-explicit-any` back to `error`; validate `status` against the `WithdrawalStatus` enum before querying (`CQ-007`).
- **Testing steps:** `turbo typecheck` + `turbo lint` green in CI.
- **Acceptance criteria:** API compiles under strict mode; `any` is an error; enum query params are validated.

### P7-T2 — Extract shared client/types/hooks; remove duplication
- **Issues:** `CQ-002`, `CQ-003`, `CQ-005`, `CQ-006`
- **Objective:** Stop copy-pasting the axios client, auth context, socket, and domain hooks across web/seller/admin; actually consume `@getx/types`.
- **Files affected:** `packages/api-client/*` (new), `packages/types/src/index.ts`, `apps/web/src/lib/api.ts`, `apps/seller/src/lib/api.ts`, `apps/admin/src/lib/api.ts`, `apps/web/src/hooks/use-games.ts`, `apps/admin/src/lib/api-error.ts`, `apps/web/src/components/header.tsx`
- **Dependencies:** P7-T1.
- **Risk:** Medium — broad refactor.
- **Implementation steps:** Extract axios client, `AuthProvider`/`useAuth`, socket client, `extractMessage`, and byte-identical hooks into `packages/api-client`/`packages/hooks` consumed via `transpilePackages` (start with `use-games.ts` + `lib/api.ts`). Import enums from `@getx/types` everywhere and delete inline redefinitions; add a test asserting the package matches Prisma enums. Decompose god components (split `header.tsx` 1,775 LOC into DesktopNav/MobileDrawer/MegaMenu/UserMenu; break 1,000+ LOC seller pages).
- **Testing steps:** All three apps build against the shared package; a Prisma enum change fails the assertion test until `@getx/types` updates.
- **Acceptance criteria:** One source of truth for client/auth/socket/hooks/enums; no god component over ~500 LOC in the touched set.

### P7-T3 — Data model: foreign keys, indexes, constraints, drift
- **Issues:** `DATA-001`, `DATA-002`, `ARCH-007`, `DATA-003`, `DATA-004`, `DATA-005`, `DATA-006`, `DATA-007`
- **Objective:** Add referential integrity to ledger/favorite tables and reconcile schema drift.
- **Files affected:** `packages/database/prisma/schema.prisma`, `packages/database/prisma/migrations/*`
- **Dependencies:** P1-T7 (CI `prisma validate`).
- **Risk:** Medium — backfill-clean orphans before adding constraints.
- **Implementation steps:**
  1. `Favorite`: add relations `userId`/`productListingId`/`customRequestId`/`sellerId` (Cascade); clean orphans first.
  2. Ledger reference columns → real relations with `onDelete: Restrict` (or FK + indexes), keeping `WalletTransaction.orderId/withdrawalId` indexes.
  3. Add the missing FK indexes from P5-T3; make `onDelete` explicit on financial/identity relations.
  4. Reconcile trigram GIN drift (model via preview feature or add a CI check asserting indexes exist post-migrate).
  5. Add the single-order-source CHECK constraint `((customRequestId IS NOT NULL) <> (productListingId IS NOT NULL))`; schedule `verifiedTier` drop; add counter reconciliation crons.
- **Testing steps:** `prisma validate` clean; migration applies against direct URL; orphan-cleanup verified; drift check green in CI.
- **Acceptance criteria:** No dangling-reference columns on financial/favorite tables; no persistent Prisma drift; counters reconciled.

### P7-T4 — Toolchain, dependencies, Docker hardening, migration automation
- **Issues:** `ARCH-010`/`INFRA-01` (toolchain), `INFRA-07`/`ARCH-012`/`AUTH-009` (bcryptjs), `INFRA-02`/`INFRA-08` (Docker), `ARCH-017`/`INFRA-06`(migrations), `INFRA-10` (PII logs), `INFRA-05`(trust-proxy doc)
- **Objective:** Converge versions, upgrade password hashing, harden the image, and automate migrations.
- **Files affected:** `Dockerfile`, `package.json`, `apps/api/package.json`, `apps/{web,seller,admin}/package.json`, `pnpm-workspace.yaml`, `railway.toml`, `apps/api/src/account/account.service.ts`, `apps/api/src/auth/auth.service.ts`, `apps/api/src/waitlist/waitlist.controller.ts`
- **Dependencies:** P1-T7, P7-T1.
- **Risk:** Medium — base-image/runtime changes.
- **Implementation steps:**
  1. Pin one pnpm everywhere (align Dockerfile to the root `packageManager` via corepack — currently `pnpm@10.15.0` is hardcoded at `Dockerfile:4`); converge `@types/node` and Node major (Docker base is `node:24`).
  2. Migrate `bcryptjs` 2.x → native `bcrypt`/`@node-rs/bcrypt` or `argon2id` with lazy rehash-on-login (cost ≥12); add a 72-byte guard if staying on bcrypt.
  3. Add a non-root user to the Dockerfile (`useradd -r -u 10001 appuser; USER appuser`) and a slimmer runtime stage copying only `dist/`, prod `node_modules`, Prisma client, and `package.json` (the final stage currently `COPY --from=build /app /app`).
  4. Add a controlled `prisma migrate deploy` step (Railway pre-deploy/release command or CI job) against the direct/non-pooled URL; document the migrate-before-deploy step in the runbook.
  5. `INFRA-10`: mask/hash emails in the waitlist controller logs. Document the `trust proxy:1` boundary.
- **Testing steps:** `docker build` runs as non-root; existing bcrypt hashes still verify and rehash on next login; CI migration step applies cleanly; image size reduced.
- **Acceptance criteria:** One pnpm/Node across surfaces; modern password hashing; non-root slim image; automated, logged migrations; no raw PII in logs.

---

## Footnotes (verification = refuted — re-check, do not blindly implement)

[^f1]: **`FUNC-002` (refuted)** — "Seller dashboard never opens because the host-only session cookie isn't sent to the `sell.` subdomain; set `COOKIE_DOMAIN=.getx.live`." The auditors **refuted** this; the existing `main.ts` comment (lines 22-27) deliberately keeps `COOKIE_DOMAIN` unset because the SPA and API live on unrelated registrable domains (Vercel vs Railway), where a PSL-adjacent value makes browsers silently drop the cookie. The real seller-dashboard breakage is the same-origin proxy mis-templating (`FUNC-001`/`P3-T2`) and the 415 activation bug (`FUNC-003`/`P3-T3`), not the cookie domain. **Do not set `COOKIE_DOMAIN`** without first confirming the final deployment topology actually shares a registrable domain across web/seller/admin; if it does, revisit. Related `FE-002` (cross-origin cookie) is `unverified` and should be settled by the same topology check.

[^f2]: **`INFRA-001` (refuted)** — "`STRIPE_WEBHOOK_SECRET` not enforced at boot — prod webhook forgeable if unset." Marked **refuted** as stated, but the underlying defence-in-depth is still valuable and is folded into **P1-T1** (provider-layer prod refusal when the secret is absent) and **P1-T9** (boot fail-fast requiring the secret when a live key is present). Treat the boot-guard portion as belt-and-suspenders, not the primary control; the primary control is the fail-closed verification in `stripe.provider.parseWebhook`.
