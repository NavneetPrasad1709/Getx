# GETX Marketplace — Master Audit Report

**Scope:** Full-stack audit of the GETX gaming marketplace (Eldorado.gg / ZeusX style), consolidating nine specialist audits across architecture, user flow, UI/UX, functional correctness, security (auth / app / payments / infra), performance, and code quality.

**System under audit:** pnpm + turbo monorepo at `d:\GetX_`. Backend: NestJS 11 + Prisma + Postgres + Redis (`apps/api`). Frontends: Next.js 15 / React 19 — `apps/web` (buyer), `apps/seller`, `apps/admin`. Shared packages: `packages/database` (Prisma), `types`, `ui`, `utils`, `games`. Payments: Stripe + Stripe Connect payouts + mock provider + optional Razorpay. KYC: Sumsub. Global, multi-currency, USD-primary; handles real money, escrow, wallets, and payouts.

**Issue counts:** 10 Critical · 37 High · 53 Medium · 33 Low · 13 Info.
**Verification:** A subset of Critical/High items were adversarially re-checked. Status is one of *confirmed*, *refuted*, *uncertain*, *unverified*, *n/a*.

**Report file:** `D:\GetX_\WEBSITE_AUDIT_REPORT.md`

---

## 1. Executive Summary

**Verdict: NO-GO for real-money operation in the current state.** The codebase is, on the merits of its engineering, well above average for a startup marketplace — clean structure, strong naming, sound auth-token architecture, a genuinely good app-security posture, and a thoughtful escrow/ledger design. The problem is not craftsmanship; it is that the **money-moving paths are not yet trustworthy end-to-end**, and the **end-user funnels (buyer checkout, seller onboarding, payouts) do not actually function** as deployed.

Three clusters dominate the risk and each is independently launch-blocking:

1. **Payment integrity is broken in confirmed, demonstrable ways.** Stripe webhooks never receive the raw request body, so signatures are verified against re-serialized JSON and the path can silently fall through (`PAY-001`, confirmed). Admin refunds omit currency and route real refunds to the **mock** provider in production (`PAY-002`, confirmed). Refunds and dispute payouts reference the **GETX order id as the Stripe `payment_intent`**, so live refunds will be rejected (`PAY-003`, confirmed). Dispute resolution moves internal ledgers but **never issues the actual buyer refund** (`PAY-005`, confirmed). Escrow **auto-releases funds to sellers on orders that were never marked delivered** (`PAY-004`, confirmed). Any one of these can cause real, irreversible financial loss or chargebacks; together they mean the escrow promise the marketplace is built on does not hold.

2. **The core revenue and supply funnels are non-functional or misconfigured.** Buyer checkout is disabled by default behind an undocumented flag (`FLOW-003`). Seller KYC has **no working UI** — the Sumsub widget is never embedded, so `kycStatus` can never reach `VERIFIED` and withdrawals are permanently blocked (`FLOW-004`). Withdrawals themselves are gated off by a second undocumented flag (`FLOW-008`), and admins have no review screen for them (`FLOW-009`). "Become a seller" fails with HTTP 415 because the fetch omits the JSON content-type (`FUNC-003`, confirmed). Production env templates set `NEXT_PUBLIC_API_URL` to a cross-origin absolute host, **re-breaking the same-origin proxy that Safari/iOS cookie login depends on** (`FUNC-001`, confirmed) — the exact regression a recent commit fixed. The homepage's "Featured drops" grid is fabricated and links to 404s (`UIUX-001`).

3. **There is essentially no safety net.** Test coverage is ~12%, with **zero tests on the money paths**, and there is **no CI/CD pipeline** at all — no typecheck, lint, test, or dependency gate before deploy (`ARCH-001`, `ARCH-003`, `CQ-001`, confirmed). For software that moves real money, shipping changes with no automated verification is itself a critical operational risk. Compounding this, the rate limiter, Socket.IO, and the cron scheduler all assume a single replica (in-memory throttler; no cron leader election), so the system **cannot be safely scaled horizontally** without Redis wiring that is present but unused.

**What matters most, in order:** (1) fix the five confirmed payment-integrity defects and add tests around them; (2) make checkout, KYC, and withdrawals actually work and flip their flags together; (3) correct the production env/cookie configuration so login and the seller dashboard open at all; (4) stand up CI and money-path tests so fixes don't silently regress; (5) wire Redis throttling + cron locking before scaling past one replica.

**Refuted / de-prioritized:** Two notable findings did **not** survive adversarial re-check — the cross-subdomain cookie claim (`FUNC-002`) and the boot-time Stripe webhook secret claim (`INFRA-001`). See §4.5. Do not spend launch effort on those as written.

---

## 2. Scorecard

Scores reconcile the per-dimension inputs and are weighted **down hard** by any *confirmed* Critical in that area.

| Dimension | Score | Justification |
|---|---|---|
| **UI** | 82 | Strong visual craft and mobile (86); undermined by fabricated "Featured drops" linking to 404s and a dead decorative admin search. |
| **UX** | 58 | Admin flow is solid (78), but the buyer (55) and seller (38) journeys are broken or dead-ended — checkout off, KYC has no widget, payouts gated, seller dashboard misconfigured. |
| **Security** | 55 | Auth (82) and app-sec (88) are genuinely strong, but blended security is dragged down by *confirmed* payment-integrity Criticals (PAY-001/002/003/005) and no-CSP on admin/seller; infra (78) is decent. Real money makes the weakest link define the score. |
| **Performance** | 76 | Frontend (82) and DB (80) are good; backend (74) pays a full user DB read per request and recomputes dashboard aggregates on a 60s poll uncached. Sound, not yet tuned. |
| **Scalability** | 55 | In-memory throttler, single-replica Socket.IO, and crons with no leader election mean the system is effectively single-replica today; Redis exists but is not wired into these paths. |
| **Maintainability** | 66 | Excellent structure/naming offset by ~1.8k-LOC god components, data-layer copy-paste across three apps, and a shared `@getx/types` package imported by zero source files. |
| **Code Quality** | 60 | Hygiene is excellent (structure 92, naming 95, error handling 84), but **test coverage 12** with zero money-path tests and no CI guts the score for real-money software. |
| **Production Readiness** | 28 | 10 Criticals (5 confirmed payment, several confirmed config/flow), no CI, non-functional checkout/KYC/payouts, and stale env templates. Not deployable for real money as-is. |

---

## 3. Top 10 Risks (ranked by business impact)

| # | Risk | Source IDs | Why it tops the list |
|---|---|---|---|
| 1 | **Escrow auto-releases to sellers on undelivered orders** | PAY-004 (confirmed) | Buyers pay, seller never delivers, money is auto-paid to the seller anyway. Directly breaks the escrow guarantee; mass refunds/chargebacks and reputational ruin. |
| 2 | **Stripe webhook signature verified against re-serialized JSON (no rawBody)** | PAY-001 (confirmed) | Payment confirmations can be spoofed or silently dropped; fail-open `JSON.stringify` fallback. Orders can be marked PAID without real payment, or never marked at all. |
| 3 | **Admin refunds route to the MOCK provider in production** | PAY-002 (confirmed) | Support clicks "refund," the system reports success, but no money leaves Stripe — guaranteed chargebacks plus the loss already booked internally. |
| 4 | **Refunds use order id as Stripe payment_intent → live refunds rejected** | PAY-003 (confirmed) | Every real refund fails at Stripe; combined with #3, the refund path is non-functional end-to-end. |
| 5 | **Dispute resolution never issues the buyer refund** | PAY-005 (confirmed) | Buyer "wins" a dispute, ledgers move, but no cash reaches them. Regulatory/chargeback exposure and trust collapse. |
| 6 | **Buyer checkout disabled + seller KYC has no UI + withdrawals gated** | FLOW-003, FLOW-004, FLOW-008, FLOW-009 | The marketplace cannot transact: no buying, no seller verification, no cashing out. Zero revenue and zero supply liquidity at launch. |
| 7 | **Prod env breaks same-origin proxy → Safari/iOS login fails again** | FUNC-001 (confirmed), FLOW-002 | A cross-origin `NEXT_PUBLIC_API_URL` re-introduces the exact cookie regression a recent fix removed; a large share of users cannot log in. |
| 8 | **No CI/CD and zero money-path tests** | ARCH-001, ARCH-003, CQ-001 (confirmed) | No automated gate means every fix above can regress silently on the next deploy. Unacceptable for real-money code. |
| 9 | **Cannot scale horizontally safely** | ARCH-004, PERF-012, BE-01 | In-memory rate limiting, single-replica realtime, and crons with no leader election → duplicate cron money-effects and ineffective abuse limits under >1 replica. |
| 10 | **Seller funnel dead on arrival** | FUNC-003 (confirmed), config items, FLOW-005/007 | "Become a seller" 415s; seller env omits `/api/v1`; "Sell on GetX" CTAs fall back to `localhost:3001`. Sellers literally cannot onboard. |

---

## 4. Full Issue Register

> Verification legend: **confirmed** = re-check reproduced the issue · **refuted** = re-check disproved it (see §4.5) · **unverified** = not yet re-checked · **n/a** = not in the re-check set.

### 4.1 Critical

| ID | Category | Title | Verification | Recommendation |
|---|---|---|---|---|
| PAY-001 | Webhook Verification | Stripe payment & Connect webhooks never receive rawBody; signatures verified against re-serialized JSON | confirmed | Create app with `{ rawBody: true }` and verify `req.rawBody`, or broaden the capture predicate to the webhook routes; remove the `JSON.stringify` fallback so verification fails closed; add a signed-fixture integration test. |
| PAY-002 | Refund Integrity | Admin `refundOrder` omits currency, routing real refunds to the MOCK provider in production | confirmed | Pass `currency: order.currency` to `processRefund`; make `processRefund` throw in production when the resolved provider is mock. |
| PAY-003 | Refund Integrity | Stripe refund uses the GETX order id as `payment_intent`; live refunds rejected | confirmed | Persist the real `pi_`/`ch_` from the completed session into `Order.stripePaymentIntentId` and refund against that; use `client_reference_id` only for lookup. |
| PAY-005 | Dispute & Refund Flow | Dispute resolution moves internal ledgers but never issues the actual buyer refund | confirmed | For buyer-favoring resolutions, call `processRefund` (with currency + real Stripe id) when escrow is HELD, or credit the buyer wallet for the principal; add a test asserting buyer funds actually move. |
| FLOW-001 | Auth / Onboarding | Login refused until email verified, but OTP email silently degrades to console-log when Resend is unconfigured | unverified | Treat `RESEND_API_KEY` (or explicit dev flag) as a prod boot requirement, show a non-prod "mail mocked" banner, and differentiate the unverified-account login error with a "resend code" affordance. |
| FLOW-002 | Config / Cookies | Env templates set `NEXT_PUBLIC_API_URL` to an absolute cross-origin host, defeating the same-origin proxy the cookie architecture depends on | unverified | Remove `NEXT_PUBLIC_API_URL` from prod templates (or set `/api/v1`); rely on `API_UPSTREAM_URL` + rewrites; add a warning comment that an absolute value breaks Safari cookies. |
| FLOW-003 | Buyer Checkout / Revenue | Entire buyer checkout disabled by default behind an undocumented flag | unverified | Document `NEXT_PUBLIC_CHECKOUT_DISABLED` in all web env templates; when Stripe is live set it false and verify the full order→Stripe→success loop; replace the bare toast with a real "notify me at launch" capture. |
| FLOW-004 | Seller Payouts / KYC | Seller KYC has no working UI — Sumsub widget never embedded, so `kycStatus` can never reach VERIFIED and withdrawals are permanently blocked | unverified | Ship the Sumsub WebSDK widget (mount with the fetched token), or add an admin "mark KYC verified" interim path, before enabling withdrawals. |
| FUNC-001 | Auth / Config | Prod env templates set `NEXT_PUBLIC_API_URL` cross-origin, defeating the proxy and re-breaking Safari/iOS login | confirmed | Set `NEXT_PUBLIC_API_URL=/api/v1` and `API_UPSTREAM_URL=https://api.getx.live` in all three frontend projects; rewrite the `.env*.example` files to match commit `0b54a2d`; replace every `getx.gg` with `getx.live`. |
| UIUX-001 | Trust / Conversion | Homepage "Featured drops" grid is entirely fabricated and links to 404s | unverified | Drive the grid from real listings (reuse `useListings`/a featured endpoint). With no live inventory, show category tiles or a coming-soon state; at minimum make cards non-linking until backed by real data. |

### 4.2 High

| ID | Category | Title | Verification | Recommendation |
|---|---|---|---|---|
| PAY-004 | Escrow | Escrow auto-releases on PAID/IN_PROGRESS orders the seller never marked delivered | confirmed | Only auto-release orders with status DELIVERED (`deliveredAt != null`); route stale PAID/IN_PROGRESS to manual review or auto-refund the buyer. |
| ARCH-001 | DevOps / CI-CD | No CI/CD pipeline — zero automated quality/security gate before deploy | confirmed | Add a GitHub Actions workflow: `pnpm install --frozen-lockfile`, `turbo typecheck/lint/test`, `prisma validate`, and `pnpm audit` as required PR checks. |
| ARCH-002 | Data Integrity / Audit | Admin money-movement CRITICAL audit logs commit outside the wallet transaction | confirmed | Move the `audit.log` call inside the `$transaction` using the tx client (match `orders.service.releaseToSeller`) so a failed CRITICAL audit rolls back the money movement. |
| ARCH-003 | Testing | Effectively no automated tests despite real-money escrow/payment logic | confirmed | Add Jest integration tests for checkout amount/currency rejection, idempotent release re-entry, refund clawback on RELEASED escrow, withdraw daily-cap, and refresh-token family revocation. |
| ARCH-004 | Scalability | Global rate limiter uses in-memory store — unenforceable across replicas | confirmed | Wire `@nestjs/throttler` Redis storage when `REDIS_URL` is present; treat Redis as a hard dependency for multi-replica deploys and document it. |
| CQ-001 | Test Coverage | Money paths (auth, orders, escrow, payments, wallet) have zero tests; no CI | unverified | Add unit tests for escrow transitions, webhook verification/idempotency/refund-clawback, withdrawal guards, and refresh-rotation theft detection; add a CI workflow running `turbo lint typecheck test` on every PR. |
| FUNC-003 | Seller / CSRF Gate | "Become a seller" always fails with HTTP 415 (native fetch omits `Content-Type: application/json`) | confirmed | Add `headers: { 'Content-Type': 'application/json' }` (+ empty JSON body), or replace the fetch with the existing `api.patch('/auth/me/activate-seller')` axios call. |
| FUNC-004 | Marketplace / CTA | Homepage "Sell on GETX" / "Start selling" fall back to `http://localhost:3001` with inconsistent fallbacks | confirmed | Guarantee `NEXT_PUBLIC_SELLER_URL` in the web build env; unify all CTAs to one helper routed through the same-origin `/sell` redirect so a missing env degrades to a working server-side redirect. |
| FUNC-005 | Config / WS + Rewrites | Prod env templates omit `API_UPSTREAM_URL` and `NEXT_PUBLIC_API_DIRECT_URL`, breaking the rewrite proxy and chat WebSocket | confirmed | Document both vars (`https://api.getx.live`) in all three `.env.production.example` files and set them in the deploy projects. |
| FLOW-005 | Seller Discovery | "Sell on GetX" / "Start selling" hardcode `localhost:3001` fallback — dead links in prod | unverified | Replace both fallbacks with `NEXT_PUBLIC_SELLER_URL || '/sellers/program'` so a missing env routes to the on-site seller program page. |
| FLOW-006 | Config / Domain | Env templates use `getx.gg` while code/CSP/cookies use `getx.live` — stale templates misconfigure deploys | unverified | Update all `.env*.example` to `getx.live` (or placeholders) and verify CSP `connect-src` matches the final API host. |
| FLOW-007 | Config / Seller | Seller `.env.example` omits the `/api/v1` suffix, so every seller API call 404s and the dashboard fails to open | unverified | Set `NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1` (or remove and rely on the rewrite); add a comment that the suffix is required unless proxied. |
| FLOW-008 | Seller Payouts | Withdrawals gated off by an undocumented `NEXT_PUBLIC_PAYOUTS_LIVE` flag — even a set-up seller cannot cash out | unverified | Document the flag; align its rollout with KYC (FLOW-004) and checkout (FLOW-003) so the three gates flip together; wire `handleWithdrawClick` to the existing `useWithdraw` mutation. |
| AUTH-001 | OAuth / CSRF | OAuth flow has no `state` parameter (login CSRF / session fixation) | confirmed | Enable a signed/encrypted `state` bound to a short-lived httpOnly cookie for both providers; reject callbacks whose state does not match. |
| AUTH-004 | OAuth / Takeover | OAuth auto-links to an existing account by email without verifying provider email (Discord `verified` unchecked) | confirmed | Only auto-link when the provider asserts a verified email (`profile.verified === true` for Discord); otherwise require the existing owner to confirm the link from an authenticated session. |
| INFRA-002 | Docker Hardening | Container runs as root; final image ships entire build tree | confirmed | Add a non-root user (`useradd -r -u 10001 appuser; USER appuser`) and a slim runtime stage copying only `dist/`, `node_modules`, the Prisma client, and `package.json`. |
| PERF-001 | Scalability / Rate limiting | Global rate limiter in-memory — unenforceable across replicas | unverified | Add a Redis throttler storage adapter pointed at the existing `getRedisClient()` singleton and pass `storage` to `ThrottlerModule.forRoot`; do this before enabling >1 replica. |
| PERF-002 | Backend / Hot path | Every authenticated request issues a full user DB read (no cache) | unverified | Cache the projected user row in Redis/LRU (≤30s TTL) keyed by `sub`; invalidate on ban/unban, password change, and status transitions. |
| PERF-004 | Backend / Aggregation | Admin dashboard recomputes full-table GMV/revenue/payout aggregates on a 60s poll with no caching | unverified | Cache the dashboard payload in Redis (~30–60s TTL) or precompute aggregates via cron into a summary table; drop the unconditional poll to manual-refresh + cache. |
| PERF-012 | Scalability / Crons | Scheduled crons have no leader election — duplicate execution across replicas | unverified | Gate crons behind a Redis distributed lock (`SET NX EX`) or run the scheduler in a single dedicated worker; make `REDIS_URL` required for multi-replica. |
| INFRA-02 | CI/CD & Quality Gates | No CI pipeline and effectively no test suite for a real-money marketplace | unverified | Add a CI workflow (install frozen-lockfile, typecheck, lint, test) blocking merges on failure; write tests for payments, escrow release, payouts, and auth guards; add a Prisma migration-diff check. |
| INFRA-03 | Scalability / Rate Limiting | Global rate limiter in-memory; ineffective under horizontal scaling | unverified | Wire the existing Redis client as Throttler storage and require `REDIS_URL` in production, or pin to a single replica and document that constraint. |
| BE-01 | Rate Limiting / Availability | Global Throttler in-memory; `SocketRateLimiter` not Redis-backed | unverified | Swap Throttler storage to Redis and back `SocketRateLimiter` with Redis INCR+EXPIRE, gated behind `REDIS_URL`. |
| BE-02 | Payments / Webhook Integrity | Stripe & Connect webhooks accept ALL events unsigned when secret unset (no `NODE_ENV` guard at provider layer) | unverified | In `PayoutsController.webhook` hard-reject when `NODE_ENV==='production' && !connectWebhookSecret`; mirror the Sumsub prod-refusal pattern in `stripe.provider.parseWebhook`. |
| FE-001 | Auth / Config | Seller & admin middleware default API root to `localhost:4000` if `API_UPSTREAM_URL` is unset | unverified | Require `API_UPSTREAM_URL` at build/boot (throw if missing in prod) instead of falling back to localhost; verify it is set as a runtime env in seller/admin projects. |
| FE-002 | Auth / Cookies | Cross-origin session cookie must reach apex subdomains for seller/admin gates | unverified | Confirm the API sets the cookie with `Domain=.getx.live`, `Secure`, appropriate `SameSite`; add an integration check that a web login grants a seller/admin session. |
| DATA-001 | Referential integrity | `Favorite` table has zero foreign-key constraints (4 dangling columns) | unverified | Add relations (`userId`, `productListingId`, `customRequestId`, `sellerId` → Cascade); clean orphans before adding constraints. |
| DATA-002 | Referential integrity | Financial ledger reference columns are unconstrained Strings (no FK) | unverified | Promote to real relations with `onDelete: Restrict` (or at minimum add FK constraints + supporting indexes); indexes already exist on `orderId`/`withdrawalId`. |
| UIUX-002 | Accessibility | Skip-to-content link broken on 33 of 34 pages | unverified | Add `id="main"` to every page's `<main>`, or centralize a `<main id="main">` wrapper in a shared shell so it can't be omitted. |
| UIUX-003 | Accessibility | Seller and admin apps have no skip link and no labelled main landmark | unverified | Add a visually-hidden skip link as the first focusable element in both layouts and give the shell `<main>` an `id="main"` target. |
| UIUX-004 | Design System | Undefined `duration-ui` / `ease-apple` classes silently disable intended motion timing | unverified | Define `transitionDuration.ui` (~200ms) and `transitionTimingFunction.apple` (`cubic-bezier(.22,1,.36,1)`) in `packages/ui/tailwind.config.ts` so the classes resolve. |
| UIUX-005 | UX / Navigation | Admin desktop header search is a non-functional decorative control | unverified | Wire it to a real federated search (users/orders/listings) or remove it until the feature exists. |
| CQ-002 | Reusability / DRY | Shared `@getx/types` is imported by zero source files; enums redefined inline across apps | unverified | Import enums from `@getx/types` everywhere; delete inline redefinitions; add a lint rule/test asserting the package matches Prisma enums. |
| CQ-003 | Reusability / DRY | Axios client, auth context, domain hooks, socket copy-pasted across web/seller/admin | unverified | Extract a shared `packages/api-client` / `packages/hooks`; start with the byte-identical `use-games.ts` and `lib/api.ts`. |
| CQ-004 | Type Safety | API tsconfig omits full strict mode; ESLint disables `no-explicit-any` for the most sensitive app | unverified | Set `strict: true` (+ `noUncheckedIndexedAccess`/`noImplicitReturns`) in `apps/api/tsconfig.json`; flip `no-explicit-any` back to `error`. |
| INFRA-001 | Secrets / Webhook | `STRIPE_WEBHOOK_SECRET` not enforced at boot — prod webhook forgeable if unset | refuted | See §4.5 — re-check found the secret is effectively enforced; do not action as written. Still add an explicit prod assertion as defence-in-depth (covered by BE-02). |

### 4.3 Medium

| ID | Category | Title | Verification | Recommendation |
|---|---|---|---|---|
| ARCH-005 | Scalability | Socket.IO realtime single-replica unless `REDIS_URL` set | n/a | Make `REDIS_URL` mandatory in prod boot, or fail closed when replicas>1 and Redis is absent. |
| ARCH-006 | Security | Admin/seller ship no CSP; payment/KYC secrets not boot-validated | n/a | Port a tightened CSP into admin + seller `next.config`; add presence/format checks for Stripe and Sumsub secrets to the prod fail-fast block. |
| ARCH-007 | Data Model | Ledger and favorite tables use bare String columns with no FKs | n/a | Add FK constraints (`onDelete: Restrict` for ledgers) or document the decoupling + add a reconciliation job flagging dangling refs. |
| ARCH-008 | Business Logic | Order creation/checkout do not re-verify buyer email or KYC status | n/a | Gate order creation on `emailVerified`; gate checkout (or high-value/withdraw-linked flows) on KYC; prompt OAuth users to set real country before transacting. |
| ARCH-009 | Authorization | Authorization is coarse role-only with ad-hoc per-resource ownership checks | n/a | Introduce a policy/ability layer (CASL or `PolicyGuard` + `@CheckOwnership`) so ownership is declared at the route and enforced centrally. |
| ARCH-010 | Build / Tooling | Toolchain version fragmentation across Docker, root, frontends | n/a | Pin one pnpm version everywhere (corepack `11.0.8`); converge `@types/node` and engines/Docker base on one Node major. |
| ARCH-011 | Data Integrity / Scalability | Denormalized counters maintained only in app code; hot lists use offset pagination | n/a | Add a reconciliation/repair job (or DB triggers); migrate browse + admin lists + `listMyOrders` to cursor pagination. |
| AUTH-002 | OAuth / Rate limiting | OAuth callback routes are not rate-limited | n/a | Add explicit `@Throttle` (~20/min/IP) to both callback handlers, matching the start routes. |
| AUTH-005 | Secret storage | OAuth provider access/refresh tokens stored in plaintext | n/a | Encrypt at rest with the existing `encryptPii` helper (or stop storing them if the refresh feature is unused). |
| AUTH-006 | Rate limiting / Scaling | Throttler in-memory — IP limits diluted across replicas | n/a | Wire a Redis throttler storage to the existing client; keep in-memory only for single-replica dev. |
| AUTH-008 | Authorization / Step-up | No re-auth / step-up for high-impact admin money actions | n/a | Require step-up (password re-entry or TOTP) with a short window for CRITICAL-severity admin actions (the audit layer already marks these). |
| AUTH-010 | MFA | 2FA is schema-present but not implemented (no TOTP path) | n/a | Implement TOTP enrollment + verification, store the secret encrypted, and require it for admin step-up. |
| PAY-006 | Ledger Integrity / Races | Cashback credited outside any DB transaction with no idempotency key | n/a | Wrap the three writes in `$transaction` and set `idempotencyKey = 'cashback:'+orderId` so duplicates are rejected. |
| PAY-007 | Ledger Integrity | `WalletTransaction.idempotencyKey` defined but never populated | n/a | Populate deterministic keys per money event (`release:`, `withdraw:`, `cashback:`) so the DB rejects duplicates independent of upstream guards. |
| PAY-008 | Refund Integrity | Partial Stripe refund on a released order performs no proportional seller clawback | n/a | Define/apply consistent partial-refund seller treatment across the webhook and admin paths (proportional clawback clamped to `sellerAmount`). |
| PAY-009 | Webhook Verification | Legacy `/payments/webhook` can be enabled in non-prod and accepts forged mock events | n/a | Remove the legacy endpoint, or require a real per-provider signing secret in the loop; never treat mock as "has secret" for live dispatch. |
| PAY-010 | Refund Integrity | Admin refund cap ignores prior refunds and non-card credit portions | n/a | Cap refundable to `buyerTotal − walletApplied − loyaltyUsdApplied − alreadyRefunded`; track cumulative refunded on the order. |
| FLOW-009 | Admin operations | No Withdrawals review screen despite backend approve/reject endpoints | n/a | Add a Withdrawals nav item + page consuming the existing endpoints before enabling seller withdrawals. |
| FUNC-006 | Seller / Onboarding | Newly activated seller can't create a first listing — KYC gate rejects `kycStatus=NONE` with no in-flow prompt | n/a | Surface a "Start identity verification" CTA after `activateSeller`, or allow a DRAFT listing pre-KYC and require KYC only to publish; make the 400 link to the KYC flow. |
| FUNC-007 | Auth / Resilience | Seller axios interceptor redirects refresh failures to a non-existent `/auth/login` on the seller origin | n/a | Redirect to the web login with a return-to param (`${WEB_URL}/auth/login?next=<absolute seller URL>`). |
| UIUX-006 | IA / Positioning | India-specific UPI rails contradict the global USD-primary positioning | n/a | Present Stripe/PayPal/Wise as primary; demote UPI to a region-gated INR-only option; remove "Withdraw to UPI" from generic global copy. |
| UIUX-007 | Trust | Unsubstantiated "Join thousands" social proof on how-it-works | n/a | Replace with launch-honest copy ("Be one of the first traders on GETX") or remove the count. |
| UIUX-008 | Accessibility | Inline form-validation errors not announced to screen readers | n/a | Add `role="alert"` / `aria-live="polite"` to the `FloatingInput`/`Input` error paragraph. |
| UIUX-010 | Design Consistency | CTA verbs and primary-button styling inconsistent across surfaces | n/a | Consolidate the primary CTA into one styled Button variant (the gradient pill) and apply the locked CTA verbs consistently. |
| UIUX-011 | Trust / Security | Admin and seller apps ship no CSP | n/a | Port a strict CSP from `apps/web/next.config.mjs` (`frame-ancestors none`, restricted script-src/connect-src). |
| APPSEC-001 | Security Misconfig | No CSP on admin and seller apps | n/a | Port the web CSP; tighten `connect-src` to each app's API origin; drop buyer-only allowances (Crisp, Pexels); avoid `unsafe-inline`/`unsafe-eval`. |
| INFRA-003 | Security Headers | No CSP on admin and seller apps | n/a | Port the web CSP (`frame-ancestors 'none'`, `object-src 'none'`, locked `connect-src`/`script-src`). |
| INFRA-04 | Security Headers | Admin/seller dashboards ship no CSP | n/a | Port via a shared header factory in `packages/ui`/`utils`. |
| FE-004 | Security / Headers | Seller and admin apps ship no CSP | n/a | Port the web CSP (with `connect-src` for API/WS origins) to both `next.config.mjs`. |
| INFRA-004 | Rate Limiting | Throttler in-memory — limits multiply/reset under scaling | n/a | Add a Redis throttler storage via the existing singleton when `REDIS_URL` is set; keep in-memory fallback for dev. |
| INFRA-005 | Rate Limiting / Proxy | `trust proxy=1` enables IP spoofing of throttle/lockout keys if API reachable off-edge | n/a | Confirm the edge strips client `X-Forwarded-For` and the container isn't reachable off-proxy; keep `trust proxy:1`; document the trust boundary. |
| INFRA-05 | Secrets Validation | Payment/KYC/storage secrets not presence-checked at boot | n/a | Extend the prod fail-fast block to require Stripe live keys + webhook secrets, R2, and Sumsub creds, and assert `PAYMENTS_ENABLE_MOCK` is off in prod. |
| INFRA-06 | DB Migrations | Prisma migrations not automated in the release pipeline | n/a | Add a controlled migrate step (Railway pre-deploy/release or CI job against the direct/non-pooled URL) with explicit gating and logging. |
| INFRA-01 (template) | Build Reproducibility | Fragmented/mismatched toolchain versions across build surfaces | n/a | Standardize one pnpm version (corepack via root `packageManager`) and one Node major across Docker/engines/`@types/node`; add an engine-strict CI check. |
| BE-03 | Data Consistency | Event-listener wallet/loyalty/rank side-effects run outside any transaction with no retry — silent reward loss | n/a | Persist a durable outbox row (or processed-flag) and retry failed reward effects via a sweeper cron, or move reward credit into a follow-up job keyed by `orderId`. |
| BE-04 | Payments / Idempotency | Stripe checkout idempotency keyed on `client_reference_id`; a second completed session races on status guard only | n/a | Record both the order-scoped guard AND the Stripe event id; on a second distinct completed session for an already-PAID order, raise a high-severity reconcile alert. |
| BE-05 | Financial Correctness | Monetary math uses JS floats (`round2`/`toNumber`) instead of Decimal | n/a | Do all money math with `Prisma.Decimal`; replace silent `Math.max(0,…)` clamps with an explicit negative-balance alert/audit. |
| BE-06 | Authz / KYC Bypass | Admin force-release and dispute `RELEASE_TO_SELLER` pay sellers without KYC/Connect gating the self-service path enforces | n/a | Re-check seller status inside `releaseToSeller`'s claim transaction; hold to `pendingEarnings` instead of `sellerWallet` when unverified/flagged. |
| BE-08 | Webhook Security | Sumsub & Stripe-Connect handlers swallow processing errors and return 200 — failed KYC/payout changes silently lost | n/a | Move the idempotency-row insert inside the same transaction as the state mutation, or return non-2xx on processing failure so the provider retries. |
| FE-003 | Auth / Routing | Seller app has no `/auth` routes; any `/auth/*` path loops or 404s | n/a | In `apps/seller/src/lib/api.ts` redirect failures to `${WEB_URL}/auth/login?next=<absolute url>`, not relative `/auth/login`. |
| FE-006 | Auth / Build-time env | Login open-redirect allowlist depends on `NEXT_PUBLIC_*` inlined at build time | n/a | Drive `TRUSTED_BASE_DOMAINS` from an env var (or include all real apexes); ensure `NEXT_PUBLIC_SELLER_URL`/`ADMIN_URL` exist in the web build env. |
| DATA-003 | Missing index | Unindexed FKs on hot Order/Listing/Request parent columns | n/a | Add `@@index([productListingId])` on Order and `@@index([orderId])` on Review; audit every FK lacking a leading-column index. |
| DATA-004 | Schema drift | Trigram GIN indexes live out-of-band; Prisma reports persistent drift | n/a | Adopt the Prisma raw-index preview, or add a CI check asserting the indexes exist post-migrate; document the guarded post-deploy SQL. |
| DATA-005 | Data consistency | Pervasive denormalized counters with no DB triggers/constraints | n/a | Add reconciliation crons; wrap counter updates in the same transaction as the source write; move `uniqueViewerIds` to a row-per-view table or HLL. |
| PERF-003 | DB / Connection pool | Prisma pool sized at 10 is a guess; admin dashboard can transiently exhaust it | n/a | Load-test to size the pool per replica (well under the pooler max); cap dashboard fan-out concurrency; apply PERF-004 caching. |
| PERF-005 | Backend / Pagination | User-facing lists capped at `take:100` with no pagination — silent truncation | n/a | Adopt the keyset/cursor pattern from `getMyListings`; move dashboard stat aggregation server-side instead of summing a truncated array. |
| PERF-006 | Backend / Caching | Redis present but unused for hot immutable reads (games, leaderboard, listing detail) | n/a | Add short-TTL Redis caching (60–300s) for `listGames`, `getGameBySlug`, `getLeaderboard`, listing detail; invalidate on the relevant admin edit/cron. |
| PERF-008 | DB / Indexing | JSON-path attribute filters on the primary ACCOUNTS browse facet are unindexed | n/a | Add a GIN `jsonb_path_ops` index (out-of-band SQL), or promote hot numeric attributes (`level`, `shinyCount`, etc.) to real indexed columns for range predicates. |
| PERF-009 | DB / Pagination | Public browse grid uses OFFSET pagination (O(offset) deep-page scans) | n/a | Migrate to keyset/cursor pagination backed by the existing composite indexes; cache or window the total count. |
| PERF-011 | Frontend / Rendering | Commerce browse pages are fully client-rendered SPAs (fetch on mount, no RSC/streaming) | n/a | Move the initial browse fetch into a Server Component/RSC and hydrate TanStack Query from the server payload; keep filters client-side. |

### 4.4 Low

| ID | Category | Title | Verification | Recommendation |
|---|---|---|---|---|
| ARCH-012 | Security / Perf | `bcryptjs` (pure-JS, major version behind) used for password hashing | n/a | Upgrade to bcryptjs 3.x, or adopt argon2 (OWASP-preferred) if the build supports the native module. |
| ARCH-013 | Maintainability | Hand-rolled Stripe integration via raw fetch instead of the official SDK | n/a | Adopt the official `stripe-node` SDK at least for webhook signature verification and Checkout creation, keeping the `PaymentProvider` interface. |
| ARCH-014 | Correctness | Mock payment simulation passes cents into a dollar-typed webhook field | n/a | Set `amount: order.buyerTotal.toNumber()` (dollars) in `simulateMockPayment` so the mock path exercises identical verification. |
| ARCH-015 | Correctness / DX | Dev mock-checkout form POST rejected by the JSON-only CSRF middleware | n/a | Convert to a `fetch()` JSON POST, or exempt the dev-only mock-pay route from the JSON-content-type middleware. |
| AUTH-003 | Session mgmt | Refresh rotation always resets TTL to 7 days, ignoring original `rememberMe` | n/a | Persist the session's intended max lifetime / absolute-expiry on the family and preserve it across rotations. |
| AUTH-009 | Password hashing | `bcryptjs` (72-byte limit) instead of argon2id | n/a | Migrate to argon2id (memory-hard, no 72-byte cap) with lazy rehash-on-login, or at minimum native bcrypt; keep cost ≥12. |
| AUTH-011 | Token exposure | `GET /auth/ws-token` returns the access token in a JS-readable JSON body | n/a | Issue a short-lived single-purpose WS ticket (~60s TTL, `ws`-only audience) instead of the full access token. |
| APPSEC-002 | XSS | `website` profile field accepts non-http(s) schemes (`javascript:`/`data:`) | n/a | Replace `z.string().url()` with `safeHttpUrl()` for `website`; if linked in UI, add a runtime scheme check + `rel="noopener noreferrer"`. |
| APPSEC-003 | Access Control | Chat WebSocket gateway allows connections with no Origin header | n/a | If native/mobile clients aren't required, reject no-Origin handshakes; otherwise document JWT as the primary control. |
| APPSEC-004 | DoS / Rate Limiting | Global throttler uses default in-memory store | n/a | Back `ThrottlerModule` with a Redis storage adapter using the existing singleton. |
| PAY-011 | Race Conditions | Sequential dispute number can collide under concurrent disputes | n/a | Use `randomBytes`-based suffixes for `disputeNumber`, matching order/withdrawal numbering. |
| BE-07 | Reliability | Dispute number generation uses `count()+1` — race under concurrent creation | n/a | Use the same year-scoped random suffix (or a DB sequence) as `orderNumber`/`withdrawalNumber`. |
| FLOW-010 | Seller KYC nav | Wallet "Start KYC" links to `/profile`, adding a hop to the (non-functional) KYC card | n/a | Once the widget exists, deep-link the wallet KYC step directly to the verification surface. |
| FLOW-011 | Admin login UX | Admin login doesn't check role client-side; non-admins hit a redirect loop | n/a | After login, refetch and check role ∈ {ADMIN, SUPER_ADMIN} before `router.push`; otherwise show an inline "admin role required" error. |
| FUNC-008 | Auth / UX copy | Soft-launch rejection hardcodes "US and UK" while the allowlist is env-driven | n/a | Make the message generic or interpolate the configured allowlist. |
| FUNC-009 | Rate limiting | Throttler in-memory; login/register/refresh limits not enforced across replicas | n/a | Wire the existing Redis client as Throttler storage when `REDIS_URL` is present. |
| FE-005 | Auth / Redundancy | Dual auth gating (middleware + client guard) can double-redirect | n/a | Keep middleware authoritative; reduce client guards to UI-state only (skeleton + activation), dropping their redirect logic. |
| FE-007 | UX / Auth | Registration intent (SELLER/BOTH) doesn't route into the seller dashboard | n/a | After verification, deep-link SELLER/BOTH users to the seller app, or call `activate-seller` during registration. |
| UIUX-009 | Trust / Content | Hardcoded fictional "trending searches" in header autocomplete | n/a | Drive trending chips from real popular queries, or relabel as "Try searching"/"Popular categories" with honest links. |
| UIUX-012 | Accessibility | Faint focus indicator on admin/seller filter inputs may fail non-text contrast | n/a | Use a solid/higher-alpha focus ring (`ring-2 ring-ring`); verify ≥3:1 contrast against the field background. |
| DATA-006 | Referential integrity | Core financial parent FKs use Prisma default `Restrict` implicitly | n/a | Make `onDelete` explicit on financial/identity relations; document that User hard-delete is blocked by design (soft-delete via `deletedAt`). |
| DATA-007 | Schema design | Dual rank systems and Order dual-source coexist as tech debt | n/a | Schedule the `verifiedTier` drop; add a CHECK constraint enforcing a single order source (`customRequestId XOR productListingId`). |
| PERF-007 | Scalability / Memory | `lastSeen` fallback Map grows unbounded without Redis; write amplification | n/a | Make `REDIS_URL` effectively required in prod for this path, or bound the fallback Map (LRU / periodic sweep). |
| PERF-010 | Frontend / Bundle | `@getx/database` (Prisma client) is in `transpilePackages` for all three frontends | n/a | Remove it from frontend `transpilePackages` (consume only `@getx/types`), or split a types-only entrypoint so the Prisma runtime can't be reached client-side. |
| PERF-013 | CDN caching | No `Cache-Control` / edge caching on public immutable API reads | n/a | Add `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` on public immutable GETs (games, leaderboard, game detail); keep authenticated endpoints `no-store`. |
| INFRA-009 | Info Disclosure | `/health/deep` open when `HEALTH_TOKEN` unset (fails open) | n/a | In production require `HEALTH_TOKEN` (403/404 when unset) instead of failing open. |
| INFRA-010 | PII in Logs | Waitlist controller logs raw email addresses | n/a | Log a hash or only country/game, or mask the email (`a***@domain`); align with the `userId`-only convention. |
| INFRA-08 | CI/CD / DevSecOps | No CI/CD security gate (no `.github/workflows`) | n/a | Add a GitHub Actions workflow: frozen-lockfile install, typecheck/lint, `pnpm audit --audit-level=high`, and a secret scanner (gitleaks/trufflehog). |
| INFRA-07 (deps) | Dependencies | Outdated/EOL deps: bcryptjs 2.x and ESLint 8 on frontends | n/a | Upgrade bcryptjs to 3.x (or native bcrypt/argon2); migrate frontends to ESLint 9 flat config; add automated update + audit checks. |
| INFRA-08 (docker) | Docker Hygiene | Production image ships the entire build tree incl. dev deps and source | n/a | Move to a pruned production artifact (`pnpm deploy` / `--prod` + explicit Prisma client copy); strip TS sources from the final image. |
| INFRA-09 (ws) | WebSocket Security | Chat gateway allows connections with no Origin header | n/a | Drop the no-origin bypass if only first-party browser clients use chat; otherwise document the channel is intentionally open and confirm JWT runs before any room join. |
| CQ-005 | Error Handling | Frontend API-error extraction ad-hoc; admin's `extractMessage` never back-ported | n/a | Move `extractMessage` into the shared client package (CQ-003) and replace the inline casts in web/seller. |
| CQ-006 | Maintainability | God components — ten files exceed 800 LOC, `header.tsx` is 1,775 LOC | n/a | Decompose by responsibility (DesktopNav/MobileDrawer/MegaMenu/UserMenu); break 1,000+ LOC seller pages into step/section components. |
| CQ-007 | Type Safety | Unvalidated query-string cast to a Prisma enum in admin finance service | n/a | Validate `status` against `WithdrawalStatus` (Zod or `includes()` guard) before the query; return 400 on invalid input. |

### 4.5 De-prioritized — Refuted findings

These were disproved on adversarial re-check. **Do not action as originally written**; recorded for traceability.

| ID | Category | Original Title | Why de-prioritized |
|---|---|---|---|
| FUNC-002 | Auth / Cross-subdomain session | "Seller dashboard never opens: host-only cookie set on the web origin is never sent to the `sell.` subdomain" | **Refuted.** Re-check found the cookie/domain handling does not break the cross-subdomain session as claimed. The real seller-onboarding blockers are the *confirmed* `FUNC-003` (415) and the env-config items (`FLOW-007`). Still worth a one-line integration test (FE-002) to keep it that way, but no code change per this finding. |
| INFRA-001 | Secrets / Webhook Integrity | "`STRIPE_WEBHOOK_SECRET` not enforced at boot — prod webhook forgeable if unset" | **Refuted.** Re-check found the secret is effectively enforced and the webhook is not silently forgeable on this path. The genuine webhook risk is `PAY-001` (rawBody, confirmed) and `BE-02` (provider-layer prod guard); address those instead. |

---

## 5. Go / No-Go Recommendation

### Decision: **NO-GO** for real-money operation.

The marketplace must not process live payments, escrow, or payouts until the gating conditions below are met. The blocking issues are not theoretical — five payment-integrity defects are *confirmed* by re-check, and the three core funnels (buy / verify / cash out) do not function as deployed.

### Gating conditions (all must be satisfied before launch)

**Tier 0 — Money integrity (hard blockers, all confirmed):**
1. `PAY-001` — Stripe webhooks verify against `rawBody`; remove the `JSON.stringify` fail-open fallback. Add a signed-fixture integration test (`PAY-014` runtime confirmation).
2. `PAY-002` — Admin refunds pass `currency`; `processRefund` throws in production if the resolved provider is mock.
3. `PAY-003` — Persist and refund against the real Stripe `payment_intent`, not the GETX order id.
4. `PAY-004` — Escrow auto-releases only on DELIVERED orders; stale PAID/IN_PROGRESS route to review or buyer auto-refund.
5. `PAY-005` — Dispute resolution issues the actual buyer refund/credit; test asserts buyer funds move.
6. `ARCH-002` — Move CRITICAL money-movement audit logs inside the wallet `$transaction`.

**Tier 1 — Funnels must function:**
7. `FLOW-003` / checkout flag flipped and the full order→Stripe→success loop verified.
8. `FLOW-004` — Working KYC path (Sumsub widget embedded, or an admin manual-verify path) so `kycStatus` can reach VERIFIED.
9. `FLOW-008` / `FLOW-009` — Withdrawals enabled with an admin review screen; all three gates (checkout, KYC, payouts) flip together.
10. `FUNC-003` — "Become a seller" sends `Content-Type: application/json`.

**Tier 2 — Configuration correctness:**
11. `FUNC-001` / `FLOW-002` / `FLOW-006` / `FLOW-007` / `FUNC-005` — `NEXT_PUBLIC_API_URL=/api/v1`, `API_UPSTREAM_URL`/`NEXT_PUBLIC_API_DIRECT_URL` set, all templates on `getx.live`, seller `/api/v1` suffix corrected, Safari/iOS login re-verified.
12. `FLOW-005` / `FUNC-004` — Seller CTAs no longer fall back to `localhost:3001`.
13. `UIUX-001` — "Featured drops" backed by real data or replaced with an honest state.

**Tier 3 — Safety net before and during launch:**
14. `ARCH-001` / `ARCH-003` / `CQ-001` — CI pipeline live (typecheck/lint/test/audit as required PR checks) with money-path integration tests for the Tier-0 fixes.
15. `AUTH-001` / `AUTH-004` — OAuth `state` parameter and verified-email gating on auto-link, before exposing social login.
16. `INFRA-002` — Container runs as non-root with a slim runtime image.

**Pre-scale condition (required before running >1 replica):**
17. `ARCH-004` / `PERF-001` / `PERF-012` / `BE-01` — Redis-backed throttler, Redis Socket.IO adapter, and cron leader election; make `REDIS_URL` mandatory in production.

**Recommended sequencing:** Tier 0 → Tier 1 → Tier 2 in lockstep with Tier 3 item 14 (write the test as you fix each defect). Soft-launch single-replica behind the country allowlist with a small cohort; satisfy condition 17 before scaling out. Treat the Medium CSP/secret-validation cluster (`ARCH-006`, `INFRA-05`, `APPSEC-001`) as a fast-follow within the first post-launch sprint.
