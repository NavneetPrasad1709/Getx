## GETX Marketplace — Functional QA Audit (Read-Only)

**Scope:** Authentication, buyer, seller, and marketplace flows traced through real code (request → controller → service → DB → response, plus the client handler). Special focus on the four reported breakages: (1) login failing, (2) signup failing, (3) seller dashboard not opening, (4) homepage seller buttons not working.

**Verdict:** The core backend auth/escrow/order logic is well-engineered (atomic transactions, constant-time login, refresh-token rotation with theft detection, idempotent webhooks, KYC-gated payouts). The reported breakages are **NOT in the business logic** — they are in the **cross-origin cookie architecture and its environment configuration**, plus two concrete client-side defects. The committed env templates actively document a configuration that re-breaks the exact Safari/cookie problem a recent commit (`0b54a2d`) was written to fix.

---

### Root-cause summary of the four reported bugs

| # | Symptom | Root cause | Severity |
|---|---------|-----------|----------|
| 1 | Login "fails" | `.env.*.example` set `NEXT_PUBLIC_API_URL=https://api.getx.gg/api/v1` (cross-origin absolute), which makes the axios `baseURL` bypass the same-origin Next rewrite proxy. Cookies set on `api.getx.gg` are not sent back by Safari/iOS (ITP) and are host-only for all browsers → session never sticks. Also `getx.gg` vs actual `getx.live`. | Critical |
| 2 | Signup "fails" | Same env mismatch as #1 (the POST itself may 201, but the user can never log in afterward → perceived as signup failure). Plus soft-launch copy hardcodes "US and UK first" while the gate is env-driven. | Critical / Low |
| 3 | Seller dashboard won't open | The session cookie is set **host-only on the web origin** (`COOKIE_DOMAIN` intentionally omitted). When the browser visits `sell.getx.live`, it sends **no** cookie, so `apps/seller/src/middleware.ts` `/auth/session` fetch returns `{user:null}` → redirect to web login → after login the cookie is still host-only on web → loop / dashboard never opens. Cross-subdomain sessions require `COOKIE_DOMAIN=.getx.live`. | Critical |
| 4 | Homepage seller buttons don't work | If `NEXT_PUBLIC_SELLER_URL` is unset at **build** time, header (`header.tsx:1753`) and `for-sellers.tsx:68` fall back to `http://localhost:3001` — a dead link in production. The header dropdown (`header.tsx:1269`) uses a different fallback (`/sellers/program`), so behavior is inconsistent. | High |

Even with the env corrected to `NEXT_PUBLIC_API_URL=/api/v1` + `API_UPSTREAM_URL=https://api.getx.live`, **bug #3 still requires `COOKIE_DOMAIN=.getx.live`** because the seller app is a different subdomain and a host-only cookie set on `getx.live` is never sent to `sell.getx.live`.

---

### Detailed findings

#### Authentication

The backend auth service (`apps/api/src/auth/auth.service.ts`) is strong: constant-time bcrypt (dummy-hash on missing user, line 326), failed-count lockout after password check (no status leak, lines 356-384), opaque refresh tokens stored as SHA-256 hash with family-based theft detection (lines 428-445), `passwordChangedAt` token invalidation in `jwt.strategy.ts:102-109`. These are correctly implemented and acknowledged.

The break is purely in **transport configuration**:

- `apps/web/src/lib/api.ts:7` — `const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1'`. The `|| '/api/v1'` fallback is correct (same-origin), but every committed env template **overrides** it with a cross-origin absolute URL.
- `apps/api/src/auth/auth.service.ts:914-929` — cookies are `sameSite='lax'`, `secure` in prod, `domain` omitted unless `COOKIE_DOMAIN` set. The comment correctly explains this is right for same-origin proxy + single-domain, but it breaks subdomain sharing (seller/admin) and is incompatible with the cross-origin `api.getx.gg` config in the env templates.
- The CSRF `Content-Type: application/json` gate (`main.ts:102-115`) is correctly enforced and the axios clients all send that header by default — so it does not break login/signup. **It does break one native-`fetch` call** (see SELLER findings).

#### Buyer features

Buyer flows are sound. `OrdersService.createFromListing` (`orders.service.ts:147-206`) reserves stock and creates the order in one `$transaction` with an atomic `updateMany` predicate, computes fees with `round2`, resolves rank-based commission, and uses a collision-resistant `ORD-YEAR-<rand>` number. Client hooks (`use-orders.ts`) call matching routes (`/orders/from-listing`, `/payments/checkout/:id`, `/orders/:id/confirm-receipt`) via axios, so the Content-Type gate is satisfied. No functional defect found in the buyer purchase path. The only buyer-facing risk is transitive: a buyer who cannot maintain a session (bugs #1/#3) cannot check out.

#### Seller features

Two concrete defects:

1. **"Become a seller" button is hard-broken (415).** `apps/seller/src/components/seller-guard.tsx:92-96` calls `fetch('/auth/me/activate-seller', { method:'PATCH', credentials:'include' })` with **no `Content-Type` header**. The API CSRF gate (`main.ts:103-112`) returns **415** for any PATCH/POST without `application/json`. So a signed-in buyer who deep-links into the seller app sees `NotASellerScreen` and the activation button always throws "Activate failed (415)". Note: the dashboard's own `ActivateBanner` (`apps/seller/src/app/page.tsx:132`) uses `api.patch` (axios sets the header) and works — proving the gate is the discriminator.

2. **New seller cannot create a first listing (403 dead-end).** `listings.service.ts:476` requires `kycStatus ∈ {VERIFIED, SUBMITTED, IN_REVIEW, PENDING}` before the first listing, but `activateSeller` (`auth.service.ts:815-849`) does not change `kycStatus` from its registration default of `NONE`. A freshly activated seller hits "Identity verification required" with no in-flow prompt to start KYC. Whether intended or not, the activation path does not route the user toward KYC, so the seller funnel stalls.

Seller listing CRUD itself is otherwise correct: ownership checks on update/delete (`listings.service.ts:606,672`), active-listing cap of 50, collision-resistant SKU/slug generation with retry.

#### Marketplace

Product create/edit/delete, discovery (public `GET /listings`, `GET /listings/:slug`), and checkout routes are correctly wired and guarded. Route ordering in `listings.controller.ts` is safe (`me/list`, `me/:id` declared before the public `:slug`). Webhook idempotency and escrow release logic are robust per the discovery map and confirmed in `orders.service.ts`.

---

### Configuration evidence (the core of bugs #1–#4)

Commit `0b54a2d` ("proxy API through Next.js rewrites for Safari/iOS login") established the intended prod config:
`API_UPSTREAM_URL=https://api.getx.live`, `NEXT_PUBLIC_API_URL=/api/v1`, `NEXT_PUBLIC_API_DIRECT_URL=https://api.getx.live`.

But the committed templates contradict it:
- `apps/web/.env.production.example:4`, `apps/seller/.env.production.example:3`, `apps/admin/.env.production.example:3`: `NEXT_PUBLIC_API_URL="https://api.getx.gg/api/v1"` (cross-origin, wrong domain, no proxy).
- None document `API_UPSTREAM_URL` (so rewrites default to `localhost:4000`), `NEXT_PUBLIC_API_DIRECT_URL` (so `socket.ts:11-15` throws in prod), or `COOKIE_DOMAIN`.
- `apps/api/.env.example:22-23` documents `COOKIE_DOMAIN=".getx.gg"` for prod, but the auth-service comment says to omit it — and the real domain is `getx.live`.

---

### Recommended fixes (priority order)

1. **Standardize env across all apps to the proxy model** (fixes #1, #2, partially #3): set `NEXT_PUBLIC_API_URL=/api/v1`, `API_UPSTREAM_URL=https://api.getx.live`, `NEXT_PUBLIC_API_DIRECT_URL=https://api.getx.live` in all three frontend projects; correct `getx.gg`→`getx.live` everywhere; rewrite the four `.env*.example` files to match commit `0b54a2d`.
2. **Set `COOKIE_DOMAIN=.getx.live`** on the API (fixes #3) so the session cookie is shared across `getx.live`, `sell.getx.live`, `admin.getx.live`. Reconcile the misleading "omit it" comment in `auth.service.ts`.
3. **Add `Content-Type: application/json` to the native fetch** in `seller-guard.tsx:93` (fixes the 415 "Become a seller" bug), or switch it to the axios `api` client.
4. **Guarantee `NEXT_PUBLIC_SELLER_URL` at build time** for the web project and unify the three CTA fallbacks (fixes #4). Prefer routing to a same-origin path (`/sell` redirect already exists in `next.config.mjs`) instead of a hardcoded `localhost:3001`.
5. **Route activated sellers into KYC** before the first-listing 403 (fix seller funnel dead-end), or relax the gate to allow a DRAFT listing pre-KYC.
