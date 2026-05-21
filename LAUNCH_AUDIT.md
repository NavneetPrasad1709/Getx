# GETX Launch Audit — 2026-05-21

> Senior marketplace + QA audit for **today's launch**. Covers user creation → browse → checkout (Stripe deferred, see §6.1). Every section ends with an explicit **PASS / FAIL** gate and a copy-pasteable **fix prompt** for the next session.
>
> Build state baseline: commit `fd00023` (OAuth backend) on `main`. Backend live at `api-production-0ef8.up.railway.app`. Frontend on `www.getx.live` (Vercel custom domain over `getx-web.vercel.app`).

## 0. Readiness snapshot

| Area | Status | Notes |
|---|---|---|
| API up + healthy | 🟢 GREEN | `/api/v1/health` returns 200 with db ok |
| Frontend build | 🟢 GREEN | Vercel serving `getx-web.vercel.app` + `www.getx.live` |
| Email-password signup | 🟡 AMBER | API path works; OTP delivery unverified — see §3.3 |
| OAuth backend (Google + Discord) | 🔴 RED | Code shipped, **Phase 7 migration not yet applied**, OAuth apps not registered, env vars empty |
| Listings + search | 🟡 AMBER | Phase 6 trigram index applied; UI/data audit pending |
| Checkout / payments | 🔴 RED | Stripe deferred per user — only `MockProvider` active. NO real money flow |
| Escrow + payouts | 🟡 AMBER | Code exists, untested end-to-end in prod |
| Lighthouse 99+ (mobile) | 🟡 AMBER | Not yet measured — see §13 |
| Lighthouse 99+ (desktop) | 🟡 AMBER | Not yet measured |
| Custom domain DNS | 🟡 AMBER | `www.getx.live` resolves; `api.getx.live` and `getx.live` apex not pointed |
| Legal pages (Terms / Privacy) | 🟡 AMBER | Exist, content needs review for current global pivot |

**Hard launch blockers (RED):** OAuth secrets, Stripe (intentionally deferred), real payment flow.
**Soft blockers (AMBER):** OTP delivery confirmation, custom domain finalization, Lighthouse baseline.

---

## 1. Pre-launch infra

### 1.1 Production environment variables — Railway (API)

| Var | Required | Current | Action |
|---|---|---|---|
| `DATABASE_URL` | ✅ | Set (Neon pooled) | Verify pooler connection-limit still 10 |
| `DIRECT_URL` | ✅ | Set (Neon direct) | Used for migrations only |
| `JWT_ACCESS_SECRET` | ✅ | Set | Rotate within 30 days post-launch |
| `JWT_REFRESH_SECRET` | ✅ | Set | Rotate within 30 days post-launch |
| `PII_ENCRYPTION_KEY` | ✅ | Set | Backup the key offline (loss = unreadable PII) |
| `WEB_URL` | ✅ | `www.getx.live,getx.live,getx-web.vercel.app` (CSV) | Add new aliases here when added in Vercel |
| `SELLER_URL` | ✅ | `getx-seller.vercel.app` | Add `sell.getx.live` once DNS pointed |
| `ADMIN_URL` | ✅ | `getx-admin.vercel.app` | Add `admin.getx.live` once DNS pointed |
| `COOKIE_DOMAIN` | ❌ removed | absent (correct — host-only cookies) | Do not re-add unless on shared apex |
| `RESEND_API_KEY` | ✅ | `re_…` set | Restricted send-only API key — fine |
| `RESEND_FROM_EMAIL` | ✅ | `GETX <noreply@getx.live>` | Verified domain in Resend ✓ |
| `NODE_ENV` | ✅ | `production` | |
| `PORT` | ✅ | `4000` | Matches Railway target port |
| `REDIS_URL` | ⚠️ | Set (Railway managed) | Audit which modules use Redis (some don't, was added speculatively) |
| `GOOGLE_OAUTH_CLIENT_ID` | 🔴 | **missing** | Required for §3.5 |
| `GOOGLE_OAUTH_CLIENT_SECRET` | 🔴 | **missing** | |
| `GOOGLE_OAUTH_CALLBACK_URL` | 🔴 | **missing** | `https://api-production-0ef8.up.railway.app/api/v1/auth/google/callback` |
| `DISCORD_OAUTH_CLIENT_ID` | 🔴 | **missing** | |
| `DISCORD_OAUTH_CLIENT_SECRET` | 🔴 | **missing** | |
| `DISCORD_OAUTH_CALLBACK_URL` | 🔴 | **missing** | `https://api-production-0ef8.up.railway.app/api/v1/auth/discord/callback` |
| `STRIPE_SECRET_KEY` | ⚠️ deferred | absent | Mock provider active — NO real charges |
| `STRIPE_WEBHOOK_SECRET` | ⚠️ deferred | absent | |
| `SUMSUB_APP_TOKEN`, `SUMSUB_SECRET_KEY` | ⚠️ | absent | KYC stays in MOCK mode |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL` | 🔴 | unknown | Without R2, uploads fall back to base64 data URLs (broken at scale) |
| `ALLOWED_SIGNUP_COUNTRIES` | ⚠️ | absent (= global rollout) | Set to `US,GB,IN` if soft-launching |
| `NEXT_PUBLIC_GOOGLE_AUTH_URL` (Vercel) | 🔴 | missing | `https://api-production-0ef8.up.railway.app/api/v1/auth/google` |
| `NEXT_PUBLIC_DISCORD_AUTH_URL` (Vercel) | 🔴 | missing | `https://api-production-0ef8.up.railway.app/api/v1/auth/discord` |
| `NEXT_PUBLIC_API_URL` (Vercel) | ✅ | `…railway.app/api/v1` | Baked into JS bundle |

**Fix prompt:**
> Render the full Railway + Vercel env var matrix above as a checklist with current state. Then walk me through registering Google + Discord OAuth apps step by step (Google Cloud Console, Discord Developer Portal), get me each client_id + client_secret, and set them on Railway. Confirm Cloudflare R2 bucket + keys for uploads. Set NEXT_PUBLIC_* on Vercel. Trigger one Railway redeploy at the end and verify /auth/google returns a 302 to accounts.google.com.

### 1.2 DNS + custom domains

| Host | Target | Status |
|---|---|---|
| `www.getx.live` | Vercel (getx-web) | ✅ Pointed, serving |
| `getx.live` (apex) | Vercel | ⚠️ Returns NXDOMAIN from public resolvers |
| `api.getx.live` | Railway | 🔴 Not pointed |
| `sell.getx.live` | Vercel (getx-seller) | 🔴 Not pointed |
| `admin.getx.live` | Vercel (getx-admin) | 🔴 Not pointed |
| `cdn.getx.live` | Cloudflare R2 | 🔴 Not pointed |

**Why this matters:** until `api.getx.live` is live, the SPA calls a `*.up.railway.app` URL which (a) leaks the infra provider, (b) blocks Safari ITP cross-site cookies in some flows, (c) prevents tightening `COOKIE_DOMAIN` to `.getx.live` (which would share auth across `www/sell/admin/api`).

**Fix prompt:**
> Walk me through adding A/CNAME records in Namecheap for `api.getx.live` → Railway, `sell/admin.getx.live` → Vercel, `getx.live` apex → www. After propagation, update Vercel `NEXT_PUBLIC_API_URL=https://api.getx.live/api/v1`, update Railway `WEB_URL/SELLER_URL/ADMIN_URL` lists, redeploy both, and set `COOKIE_DOMAIN=.getx.live` so cookies span all four subdomains.

### 1.3 Database — Neon

- Phase 1–6 migrations applied to prod ✓
- **Phase 7 (OAuth) migration committed but not applied** 🔴 — running API code expects the table to exist; first `/auth/google/callback` will throw `relation "OAuthAccount" does not exist`.
- Backup policy: Neon free tier point-in-time recovery to last 7 days. Confirm tier supports the user volume you plan to launch with.
- Connection pool: pooler URL with `connection_limit=10` + `pool_timeout=20`. Watch for `Too many connections` if API replicas scale.

**Fix prompt (RUN BEFORE ANY OAUTH ATTEMPT):**
> Apply the Phase 7 OAuth migration to Neon. Authorize me to run `pnpm --filter @getx/database exec prisma migrate deploy` from this repo against the production DATABASE_URL. After it lands, verify with `prisma migrate status` that all 7 migrations are applied. Then verify `User.password` is nullable and `OAuthAccount` table exists by reading from `information_schema`.

### 1.4 Container + runtime hardening

- ✅ Dockerfile ships full built workspace (avoids `pnpm deploy` stripping the Prisma client)
- ✅ Healthcheck timeout = 300s (handles Neon cold start)
- ✅ Restart policy: on-failure, max 10
- ✅ App binds to `0.0.0.0` (Railway edge can reach)
- ✅ Helmet middleware, raw-body capture for webhooks
- ⚠️ No structured logging shipper — `AllExceptionsFilter` emits JSON lines, but no Logtail/Axiom/Datadog drain. Crashes will be hard to retrieve once Railway log retention runs out.

**Fix prompt:**
> Add a log shipper. Easiest: Logtail (free 1GB/mo). Walk me through creating the source + adding the `LOGTAIL_SOURCE_TOKEN` env var on Railway. Modify `AllExceptionsFilter` to also POST 5xx events to Logtail's HTTP intake. Add `LOGTAIL_SOURCE_TOKEN` to required env list in `main.ts`.

---

## 2. Schema + data correctness

### 2.1 Migration drift

```
$ prisma migrate status
20260520140000_phase2_indexes_cascade_webhook_event  ✅
20260520150000_phase5_stripe_only                    ✅
20260520160000_phase6_listing_trigram_search         ✅
20260521170000_phase7_oauth_accounts                 🔴 NOT APPLIED
```

### 2.2 Index audit

Run before launch to confirm hot-path indexes exist:

```sql
-- Listings: trigram search
SELECT indexname FROM pg_indexes WHERE tablename = 'ProductListing'
  AND indexname IN ('ProductListing_title_trgm_idx', 'ProductListing_description_trgm_idx');

-- Orders: dashboard sort + escrow cron
SELECT indexname FROM pg_indexes WHERE tablename = 'Order'
  AND indexname IN ('Order_status_createdAt_idx', 'Order_escrowStatus_autoReleaseAt_idx');

-- User: hot lookups
SELECT indexname FROM pg_indexes WHERE tablename = 'User'
  AND indexname IN ('User_email_key', 'User_country_idx', 'User_kycStatus_idx');
```

### 2.3 PaymentProvider enum

Phase 5 narrowed to `STRIPE` only. Until Stripe is wired the API uses `MockProvider` (returns `mock_pi_*` payment intents). Orders ARE created with `paymentProvider='STRIPE'` even in mock mode — verify by querying:

```sql
SELECT DISTINCT "paymentProvider" FROM "Order";  -- should only ever return STRIPE or NULL
```

### 2.4 Cascade rules

Verified in Phase 2: `KycDocument.userId`, `LoyaltyTransaction.userId`, `Referral.referrerId` are `RESTRICT` (hard-delete on User cannot wipe financial/compliance rows). Soft delete via `User.deletedAt` is the only supported deletion path.

**Fix prompt:**
> Run the SQL block in §2.2 against the prod Neon DB and report which indexes are missing. For any missing, write a follow-up Phase 8 migration that adds them with `CREATE INDEX IF NOT EXISTS`. Also verify with a 200-row sample that no Order has `paymentProvider IN ('PADDLE', 'PAYPAL', 'RAZORPAY', 'CRYPTO')`.

---

## 3. Flow audit — User creation

### 3.1 Landing page (`/`)

- ✅ Renders 200 from `www.getx.live`
- ⚠️ Hero video file size — check `/hero/hero.mp4` weight (target <2 MB or LCP suffers on 3G)
- ⚠️ Hero poster image — confirm <100 KB AVIF/WebP
- ⚠️ Above-the-fold CSS not inlined? Next 15 should do this automatically; verify in DevTools Performance
- ⚠️ Cookie consent banner (`cookie-consent.tsx` is untracked locally — needs commit)
- ✅ Footer links to `/terms`, `/privacy`, `/contact`

**Manual check:**
1. Open `www.getx.live` in incognito on mobile
2. DevTools → Network → Throttle to "Fast 3G"
3. Hard reload — note LCP timing in Performance Insights
4. Page weight (Network → bottom): target <500 KB on first load

### 3.2 Sign-up form (`/auth/register`)

- ✅ Form fields: name, email, password (with strength meter), country (13 options, no default), buyer/seller/both, accept terms
- ✅ Client-side validation (Zod + react-hook-form)
- ✅ Calls `POST /api/v1/auth/register`
- ✅ Backend validates: sanctions hard-block check → soft-launch allowlist (if `ALLOWED_SIGNUP_COUNTRIES` set) → duplicate email (returns same response shape for security) → bcrypt hash → user + EmailVerification rows in transaction
- ✅ HTTP 201 with `{ message, userId, email }`
- ✅ Redirects to `/auth/verify-email?email=…`

**Edge cases to test before launch:**

| Test | Expected |
|---|---|
| Empty name | Client-side: "Name required" |
| Password missing uppercase | "Must contain uppercase" |
| Country left blank | "Select your country" |
| Existing email | 201 with same shape (no enumeration leak) |
| Sanctions country (KP/IR/SY/RU/CU/VE) | 403 "GETX is not available in your region" |
| Below-min password | "Min 8 characters" |
| Submit during 429 cooldown | Rate-limited at 5/hour per IP |

### 3.3 Email OTP — STATUS UNCLEAR 🔴

**Known facts:**
- Resend domain `getx.live` verified ✓ (user confirmed)
- API key `re_…` is restricted to send-only (can't read delivery status from CLI)
- Test send via direct curl returned `HTTP 200` with email id
- User reports OTP **not arriving** when signing up on `www.getx.live`

**Possible causes (ranked):**
1. **Spam folder** — first emails from a new domain often flagged. Check Spam + Promotions tabs.
2. **Recipient address typo** in signup form
3. **API exception silently caught** — `mail.sendVerificationOtp` is called fire-and-forget with `.catch(err => console.error)`. Errors surface only in Railway logs.

**Fix prompt:**
> 1. Pull the last 200 lines of Railway Deploy Logs for the api service since the latest deploy. Grep for "Email send failed" and "Failed to send email to".
> 2. From Resend dashboard → Emails tab, filter by today's date and tell me the delivery status of the most recent 5 sends.
> 3. If Resend says "delivered", instruct user to check spam folder and add `noreply@getx.live` to contacts.
> 4. If Resend says "bounced" or "rejected", read the error message and propose a fix (DKIM/SPF tightening, or change `RESEND_FROM_EMAIL`).
> 5. Patch `auth.service.ts` so OTP send failures are surfaced via AuditService at `severity='ERROR'` and a follow-up notification is queued for the user.

### 3.4 Email verification (`/auth/verify-email`)

- ✅ 6-digit numeric OTP, expires 10 min after issue
- ✅ Throttle: 10 verify attempts per 10 min per IP
- ✅ Attempts counter on `EmailVerification` row (lock after 5)
- ✅ On success: marks `User.emailVerified = now`, sends Welcome email
- ⚠️ No resend-OTP UI feedback for the 60s cooldown after a resend (auth.service.ts:267 enforces it server-side but page doesn't show countdown)

### 3.5 OAuth sign-in — Google + Discord 🔴 NEEDS WIRING

Backend ready (commit `fd00023`), buttons render in SocialAuth, but:
- Provider apps not registered
- `GOOGLE_OAUTH_*` and `DISCORD_OAUTH_*` env vars not set on Railway
- `NEXT_PUBLIC_GOOGLE_AUTH_URL` and `NEXT_PUBLIC_DISCORD_AUTH_URL` not set on Vercel
- Phase 7 migration not applied (callback would throw)

**Fix prompt:**
> Walk me through:
> 1. Google Cloud Console → APIs & Services → OAuth consent screen (External, app name "GETX", support email, dev contact, scope email+profile) → Credentials → OAuth 2.0 Client ID → Web app → authorized redirect: `https://api-production-0ef8.up.railway.app/api/v1/auth/google/callback`. Copy client_id + client_secret to me.
> 2. Discord Developer Portal → New Application "GETX" → OAuth2 → Add redirect: same callback under `/discord/callback` → Copy client_id + client_secret.
> 3. Apply Phase 7 migration (see §1.3 prompt).
> 4. Set all 6 OAuth env vars on Railway.
> 5. Set `NEXT_PUBLIC_GOOGLE_AUTH_URL` and `NEXT_PUBLIC_DISCORD_AUTH_URL` on Vercel.
> 6. After both deploy, e2e test: click Google button on `www.getx.live/auth/register` → consent → callback → land back on `www.getx.live/?oauth=ok` with cookies set → `/auth/me` returns user object.

### 3.6 Login (`/auth/login`)

- ✅ Rate-limited 10/15-min per IP
- ✅ Account lock after 5 failed attempts (15 min)
- ✅ Cross-site cookies: `SameSite=None; Secure; HttpOnly` (verified `eb87eb3`)
- ✅ OAuth-only accounts blocked with friendly hint
- ⚠️ Pre-launch: confirm "remember me" 30-day refresh works end-to-end via DevTools — set a session, close browser, reopen, refresh `/auth/me`

### 3.7 Forgot password + reset

- ✅ `/auth/forgot-password` → generic response (no enumeration)
- ✅ Token TTL 1 hour, single-use
- ✅ On reset, ALL refresh tokens revoked
- ⚠️ Reset link in email points to `${WEB_URL}/auth/reset-password?token=…` — verify WEB_URL on Railway is the first comma-separated entry (`www.getx.live`) since `auth.service.ts:480` uses raw env value, not the parsed first-of-CSV.

**Concrete bug:** `auth.service.ts:476` line `${this.config.get<string>('WEB_URL')}/auth/reset-password?...` will produce a link like `https://www.getx.live,https://getx.live,https://getx-web.vercel.app/auth/reset-password?token=...` — comma-poisoned URL.

**Fix prompt:**
> Patch `auth.service.ts` `forgotPassword` and any other place that reads `WEB_URL`. Add a helper `private firstWebUrl()` that splits on `,` and trims. Replace every `this.config.get<string>('WEB_URL')` with `this.firstWebUrl()`. Same for `SELLER_URL` and `ADMIN_URL`. Write a small unit test that asserts `forgotPassword` returns a non-comma URL given a CSV env value.

### 3.8 Session refresh

- ✅ Token theft detection: presenting a revoked refresh token invalidates the entire family
- ✅ SHA-256 hashed in DB (raw DB read can't grant a session)
- ✅ 7-day expiry (or 24h without remember-me)
- ⚠️ Frontend `apps/admin/src/lib/api.ts:54` and equivalents have a refresh interceptor — confirm it doesn't infinite-loop on a 401 from `/auth/refresh` itself

---

## 4. Flow audit — Browse + search

### 4.1 Listings index (`/games/pokemon-go/accounts`, `…/top-ups`, `…/items`)

- ✅ Server-rendered (Next App Router) — first paint includes data
- ✅ Trigram search backed (Phase 6)
- ⚠️ Pagination cursor — verify Listings DTO's `page+limit` produces stable ordering with `sort=newest` (default). Sort=popular needs an aggregated views/sales tally
- ⚠️ Empty state — show "no listings match" copy, not blank grid
- ⚠️ Image lazy-load — listing cards must `loading="lazy"`, especially below the fold
- ⚠️ Listing card heights — fix grid `aspect-square` cover so mismatched image ratios don't shift layout (CLS budget)

**Manual check:**
1. `/games/pokemon-go/accounts` — DevTools Network → page weight should be <1 MB on first render
2. Lighthouse CLS — target 0
3. Type "lv 50" in search → results filter via trigram index (should be <100 ms when DB warm)

### 4.2 Listing detail (`/games/pokemon-go/accounts/[slug]`)

- ✅ Server-rendered metadata (OpenGraph image, title, description)
- ⚠️ Confirm slugs are stable and URL-safe (lowercase, no spaces)
- ⚠️ 404 handler for invalid slugs — should return Next's not-found, not crash

### 4.3 Saved searches

- ✅ Cron replays filter and emails matches
- ⚠️ Test that unsubscribe link in alert email actually flips `User.emailNotifications=false`

---

## 5. Flow audit — Account + profile

### 5.1 `/auth/me`

- ✅ Returns scoped fields only — no password, twoFactorSecret, aadhaarHash, panHash
- ✅ Requires JWT cookie

### 5.2 Profile settings (`/profile/settings/*`)

- ⚠️ Avatar upload — confirm R2 is configured. Without R2 the API returns base64 data URLs which inflate every subsequent /auth/me response.
- ⚠️ Display name validation — max length, special chars
- ⚠️ Notification preferences — toggle persists across reload (DB sync, not just local state)
- ⚠️ Linked-providers section — list OAuthAccount rows under "Connected accounts"; add an "Unlink" button (will need new endpoint `DELETE /auth/oauth/:provider`)

### 5.3 Change password

- ✅ Guard added: OAuth-only users get "use SSO" hint instead of crash
- ⚠️ Pre-launch: add a "Set initial password" flow for OAuth users so they can later use email-password as a backup

### 5.4 Delete account

- ✅ Soft delete via `deletedAt` + 30-day grace
- ✅ Daily `AccountAnonymizeCron` finalises PII redaction (the cron is currently uncommitted — see Open Tickets in §15)

---

## 6. Flow audit — Checkout (Stripe deferred)

### 6.1 Mock payment provider — current behaviour

[apps/api/src/payments/payments.service.ts](apps/api/src/payments/payments.service.ts) wires `MockProvider` when `STRIPE_SECRET_KEY` is absent. Mock provider returns synthetic `pi_mock_*` IDs and always reports `status=succeeded`.

**Implication for launch:** ANY checkout WILL appear to succeed without taking real money. Orders WILL be created in `PAID` state, escrow timer starts, seller gets notified to deliver — even though no charge happened.

**Mitigation while Stripe is deferred:**

| Option | What |
|---|---|
| (a) Hide checkout entirely | Set a feature flag `NEXT_PUBLIC_CHECKOUT_DISABLED=true` and render a "Checkout coming soon — early access" banner on listing detail pages. Disable the "Buy now" button. |
| (b) Show waitlist instead | "Buy now" → modal "Reserve this listing for $0, we'll charge when checkout launches next week". Capture email, no charge. |
| (c) Run with mock provider as visible "demo mode" | Big "Demo mode — no real money" banner across the site. Risky — users may confuse it for the real product. |

**Strongly recommended: (a) or (b) until Stripe is live.**

### 6.2 Checkout flow when Stripe IS live (future audit, not today)

Skipping the deep checkout audit since Stripe isn't wired. Will revisit when `STRIPE_SECRET_KEY` is set.

### 6.3 Cart / order creation

[apps/api/src/orders/orders.service.ts] — check:
- Idempotency key on order create (so a duplicate POST doesn't double-charge)
- Stock decrement: if listing is single-unit (an account), mark it `SOLD` atomically with order create
- Buyer + seller `WalletTransaction` rows created with `pending=true` until escrow auto-release

**Fix prompt (deep checkout audit when Stripe wires):**
> Walk me through the buyer purchase flow end-to-end: `POST /orders` → Stripe PaymentIntent created → webhook delivery → escrow funded → seller delivery → buyer confirms / auto-release 3 days → seller payout queued. For each step, point at the file and the line that owns it, identify race conditions (parallel `POST /orders` for the same listing, webhook delivered before order row commits, etc.), and add idempotency / locking where missing.

---

## 7. Flow audit — Seller

### 7.1 Become a seller

- ✅ `PATCH /auth/me/activate-seller` flips `isSeller=true`
- ⚠️ KYC gate — sellers above ₹/$ threshold should be blocked from withdrawals until KYC LEVEL_1+. Confirm `payouts.service.ts` enforces this.

### 7.2 Create listing

- ⚠️ Image upload size limit — what's the max? Check multer config + R2 upload service
- ⚠️ Markdown/rich-text in description sanitised? XSS surface
- ⚠️ Price validation — minimum, maximum (block obvious mistakes like $1 for a Lv 50 account)

### 7.3 Inventory + my orders

- ✅ Lists buyer + seller orders separately
- ⚠️ Verify rank progression cron updates `User.rank` based on completed sales

---

## 8. Flow audit — Admin

### 8.1 Admin app (`getx-admin.vercel.app`)

- ✅ Separate Next app
- ⚠️ Auth gate: only `UserRole=ADMIN` or `SUPER_ADMIN` can log in. Verify on a fresh session that a BUYER cannot reach `/dashboard`.
- ⚠️ Audit logs UI — list with filters
- ⚠️ Refund / force-release / ban actions — each MUST write an `AuditLog` row with the admin user id

### 8.2 Dispute resolution

- ⚠️ Open disputes queue
- ⚠️ Time-to-first-response metric

---

## 9. Security audit

### 9.1 OWASP Top 10 quick pass

| Category | Status | Notes |
|---|---|---|
| Injection | ✅ | Prisma parameterised queries; raw SQL only in migrations |
| Broken auth | 🟡 | JWT, bcrypt, refresh-token rotation, lock on 5 fails — solid. Audit MFA later. |
| Sensitive data exposure | ✅ | PII encrypted at app layer via PII_ENCRYPTION_KEY; HTTPS everywhere |
| XML External Entities | N/A | No XML parsing |
| Broken access control | ⚠️ | Audit every `@UseGuards(JwtAuthGuard)` controller — ensure `@Roles(...)` decorator on admin-only routes |
| Security misconfiguration | 🟡 | Helmet on; CSP not yet tuned (uses default `default-src 'self'` — verify no inline scripts break) |
| XSS | ✅ | React auto-escapes; no `dangerouslySetInnerHTML` outside of OpenGraph image generation |
| Insecure deserialization | ✅ | All JSON body parsing through express.json |
| Vulnerable components | ⚠️ | Run `pnpm audit --prod` before launch |
| Insufficient logging | 🟡 | `AuditService` captures key events; structured logs not shipped to external store (see §1.4) |

### 9.2 Rate-limiting matrix

| Endpoint | Limit | Status |
|---|---|---|
| `POST /auth/register` | 5 / hour | ✅ |
| `POST /auth/login` | 10 / 15 min | ✅ |
| `POST /auth/refresh` | 30 / min | ✅ |
| `POST /auth/forgot-password` | 3 / hour | ✅ |
| `POST /auth/reset-password` | 5 / hour | ✅ |
| `POST /auth/verify-email` | 10 / 10 min | ✅ |
| `POST /auth/resend-otp` | 3 / 10 min | ✅ |
| `GET /listings` | none | ⚠️ Add 60/min per IP |
| `GET /auth/google` (start) | none | ⚠️ Add 20/min per IP to prevent abuse-via-redirect |

**Fix prompt:**
> Add `@Throttle({ default: { limit: 60, ttl: 60000 } })` to `ListingsController.findAll`, and limit 20/min on the two OAuth start routes. Verify in dev by hammering `curl -s -o /dev/null -w "%{http_code}\n" …/api/v1/listings` 100x in a row — expect a 429 after 60.

### 9.3 CORS

- ✅ Multi-origin allowlist working (commit `f608e0e`)
- ⚠️ Confirm `Access-Control-Allow-Origin` is NEVER `*` (with credentials, browsers reject `*`)

### 9.4 CSRF

- N/A — we use SameSite=None+Secure cookies + custom CORS allowlist + `credentials: true`. Cross-origin POSTs from non-allowed origins are blocked by CORS preflight.

### 9.5 Secrets hygiene

- ⚠️ Audit `git log -p | grep -E "(re_|sk_|whsec_|AKIA)" -B 1 -A 1` — any committed secret needs rotation
- ⚠️ `.env`, `.env.local`, `.env.production` — confirm all in `.gitignore` (verified ✅)

### 9.6 Account enumeration

- ✅ Register: duplicate email returns same shape as fresh signup
- ✅ Forgot password: always returns `"If account exists, reset link sent."`
- ✅ Login: distinguishes "Invalid credentials" without revealing which (email or password) was wrong

---

## 10. Performance — Lighthouse 99+ goal

### 10.1 Measure first, then optimise

**Run NOW before any opt work:**

```bash
# Mobile (default in PageSpeed)
npx lighthouse https://www.getx.live --preset=desktop --view --output html --output-path ./lh-desktop.html
npx lighthouse https://www.getx.live --view --output html --output-path ./lh-mobile.html
```

Or use [pagespeed.web.dev](https://pagespeed.web.dev/) entering `https://www.getx.live`.

### 10.2 Likely failures + fixes

| Issue | Threshold | Likely cause | Fix |
|---|---|---|---|
| LCP > 2.5s mobile | Performance < 90 | Hero video / Unsplash placeholder image | Self-host hero, use `next/image` with `priority`, preload critical font |
| CLS > 0.1 | Performance < 90 | Listing card image height not fixed | Wrap in `<div className="relative aspect-square">` with `<Image fill>` |
| Render-blocking CSS | Performance | Tailwind compiled CSS too large | Already tree-shaken by Next 15; confirm production build CSS <50 KB |
| Unused JS | Performance | Vercel analytics + speed insights | Lazy-load via dynamic import, or remove until traffic justifies |
| Color contrast | Accessibility < 100 | `text-muted-foreground` on `bg-background` | Verify with axe DevTools; if any fail, bump foreground HSL lightness |
| Missing alt text | Accessibility | Avatars / hero images | Add `alt="..."` (or `alt=""` if decorative) everywhere |
| HTML lang attribute | Accessibility | `<html lang="en">` set in root layout | Verify in `apps/web/src/app/layout.tsx` |
| Tap target sizing | Accessibility | Mobile buttons under 44×44 px | Audit `h-` Tailwind utilities; bump to `h-11` minimum on touch UI |
| Best Practices: deprecated APIs | < 100 | Console warnings about `document.write`, etc. | Hunt + remove |
| Best Practices: no HTTPS errors | < 100 | Mixed content (http:// images) | Confirm every external URL uses https |
| SEO: meta description | < 100 | Missing on some pages | Verify root layout + per-page `metadata` exports |
| SEO: robots.txt | < 100 | Confirm `/robots.txt` allows crawl of public pages, disallows `/profile/*`, `/auth/*` |
| SEO: structured data | < 100 | No JSON-LD yet | Add `Product` schema for listing pages, `Organization` for landing |

### 10.3 Optimization checklist (ordered by impact)

1. **Self-host hero video + poster** — move to `/public/hero/` from any third-party CDN. Use AVIF poster (<50 KB), MP4 H.264 baseline (<2 MB), preload="metadata".
2. **`next/image` everywhere** — replace every `<img>` with `<Image>` from `next/image`. Configures responsive srcset + AVIF/WebP serving automatically.
3. **Font subsetting** — already loading Poppins via `next/font/google` (good). Ensure `display: 'swap'` is set.
4. **Preload critical resources** — primary hero image + display font.
5. **Cache headers** — Vercel sets sensible defaults; verify `/_next/static/*` returns `immutable, max-age=31536000`.
6. **Lazy-load Vercel Analytics** — they auto-defer, but confirm in DevTools Network → only loads after `idle` event.
7. **Remove unused Tailwind classes** — Next 15 + Tailwind 3 tree-shake automatically; verify with `npm run build` and check `apps/web/.next/static/css/` size.
8. **Disable Lucide barrel imports for icons used 10+ times** — direct `import { ShieldCheck } from 'lucide-react/icons/shield-check'` saves bundle weight (the config already opts `lucide-react` into `optimizePackageImports`).
9. **Bundle analyzer** — `pnpm --filter @getx/web exec next build` then inspect `apps/web/.next/analyze` if `next.config` exposes it. Identify chunks > 100 KB.
10. **HTTP/2 hints** — Vercel uses HTTP/3 already; confirm no `<link rel="preconnect">` typos.

**Fix prompt:**
> 1. Run Lighthouse mobile on `https://www.getx.live`. Paste me the full report.
> 2. For every metric that scores below 99, propose the smallest possible change to push it to 99+.
> 3. Apply the fixes one by one (commit after each so we can bisect if any regresses). Re-run Lighthouse after each commit.
> 4. Stop only when both desktop AND mobile are 99+ across Performance / Accessibility / Best Practices / SEO.

---

## 11. Mobile-specific

- ✅ Viewport meta set via Next 15
- ⚠️ Touch targets — verify every button is ≥44×44 px on touch (`h-11 w-11` minimum)
- ⚠️ Tap delay — `touch-action: manipulation` on interactive elements
- ⚠️ Mobile nav — confirm a hamburger / bottom-tab nav exists
- ⚠️ Form input zoom on focus (iOS) — `font-size: 16px` minimum on text inputs prevents auto-zoom
- ⚠️ Safe areas — `padding-bottom: env(safe-area-inset-bottom)` on fixed bottom nav
- ⚠️ Pull-to-refresh — don't disable; let browser handle
- ⚠️ Standalone PWA — confirm `manifest.json` exists with proper icons

**Fix prompt:**
> 1. Open `www.getx.live` on a real iPhone (or Chrome DevTools iPhone 13 emulation).
> 2. Tap every nav link, button, and form field. Note anything that's too small, slow to respond, or causes a zoom-in on focus.
> 3. Verify the bottom of every page respects safe-area-inset-bottom.
> 4. Patch issues in a single commit per category (tap-targets, font-size, safe-area, PWA manifest).

---

## 12. SEO + content

### 12.1 Pages that must have unique meta

- `/` (landing) — title, description, OG image
- `/games/[game]` — per-game title + description
- `/games/[game]/accounts/[slug]` — per-listing
- `/u/[username]` — per-seller
- `/terms`, `/privacy`, `/contact`, `/about` (if exists)

### 12.2 Robots + sitemap

- ✅ `apps/web/src/app/sitemap.ts` exists
- ⚠️ Verify it queries DB for active listings + emits URLs
- ⚠️ Robots.txt — confirm `/auth/*`, `/profile/*`, `/admin*` are Disallow

### 12.3 OpenGraph + Twitter cards

- ✅ Default OG image at `apps/web/src/app/opengraph-image.tsx`
- ⚠️ Per-listing OG image at `apps/web/src/app/api/og/profile/[username]/route.tsx` and `apps/web/src/lib/listing-og.ts` — verify these render correctly on Twitter Card Validator + Facebook Sharing Debugger

### 12.4 Structured data

- ⚠️ No JSON-LD detected. Add:
  - `Organization` on `/`
  - `Product` (with offers) on listing pages
  - `BreadcrumbList` on category pages

---

## 13. Observability

| Layer | State | Action |
|---|---|---|
| API request logs | Railway native | Add log shipper (see §1.4) |
| Error tracking | None | Add Sentry — both web (`apps/web`) and API (`apps/api`) |
| Performance monitoring | Vercel Analytics + Speed Insights (untracked package.json changes — need commit) | Confirm `@vercel/analytics` + `@vercel/speed-insights` land |
| Uptime monitoring | None | Add UptimeRobot or BetterStack pinging `/api/v1/health` every 60s |
| Database query analytics | Neon dashboard built-in | Watch slow query log post-launch |

**Fix prompt:**
> Add Sentry to both apps/web and apps/api with `@sentry/nextjs` and `@sentry/node`. Use DSNs from Sentry dashboard. Wire to existing AllExceptionsFilter so every 5xx reports. Add `SENTRY_DSN` to required env on both Railway and Vercel. Create a free UptimeRobot account, add a monitor for `https://api-production-0ef8.up.railway.app/api/v1/health` with email alerts on downtime.

---

## 14. Legal + content

- ✅ `/terms` page exists
- ✅ `/privacy` page exists
- ⚠️ Review content — global pivot supersedes earlier India-only language (`memory/project_global_pivot.md`)
- ⚠️ GDPR compliance: data export endpoint exists (`DataExportRequest` model), surface it under Account → Privacy
- ⚠️ Cookie consent — `cookie-consent.tsx` exists but untracked. Commit + verify it shows on first visit
- ⚠️ DPA with Resend (data processor) — confirm signed if launching in EU
- ⚠️ DPA with Neon, Vercel, Railway — sign post-launch within 30 days

---

## 15. Open tickets (uncommitted local changes)

The working tree has ~40 files modified that have NOT been committed yet, including legitimate improvements:

| File | What it adds | Priority |
|---|---|---|
| `apps/api/src/account/account-anonymize.cron.ts` | Daily PII redaction cron | P1 — required for GDPR-grade delete |
| `apps/api/src/account/account.module.ts` (M) | Registers the cron | P1 |
| Multiple service files (M) | Pre-existing senior-audit improvements | P2 |
| `apps/admin/src/app/layout.tsx` (M) | Probably vercel/analytics wiring | P2 |
| `cookie-consent.tsx` (untracked) | Cookie banner | P1 — legal requirement |
| `apps/{web,admin,seller}/package.json` (M) | `@vercel/analytics` + `@vercel/speed-insights` | P2 |

**Fix prompt (do this AFTER OAuth is verified end-to-end):**
> Take the working tree's uncommitted changes and split them into focused PRs:
> 1. P1: Account anonymise cron + module registration + cookie consent banner (legal compliance bundle)
> 2. P2: Vercel analytics/speed insights wiring across 3 Next apps (observability bundle)
> 3. P3: Remaining senior-audit improvements (defensive hardening bundle)
> For each PR, run `pnpm typecheck` and `pnpm build` in every affected workspace before committing. Push each as a separate commit so we can bisect if anything breaks.

---

## 16. Go / no-go checklist — launch decision

**Must be GREEN to launch:**

- [ ] Phase 7 migration applied to Neon
- [ ] OAuth env vars set on Railway + Vercel (or buttons hidden if deferring OAuth)
- [ ] OTP delivery confirmed working end-to-end (signup → email arrives → verify)
- [ ] Checkout disabled OR feature-flagged with "Demo mode" banner (Stripe not wired)
- [ ] Custom domain `api.getx.live` pointed (or accept the `*.railway.app` URL leak)
- [ ] R2 configured for uploads
- [ ] Lighthouse score ≥99 on `www.getx.live/` (desktop AND mobile)
- [ ] No console errors on landing page load (DevTools, Safari + Chrome)
- [ ] Sentry or equivalent error tracking live
- [ ] UptimeRobot watching `/api/v1/health`
- [ ] At least one full end-to-end test in production:
  - Anonymous user lands on `/`
  - Clicks "Sign up"
  - Completes form with REAL email
  - Receives OTP, verifies
  - Lands on dashboard, sees their account
  - Logs out, logs back in
  - Browses a listing
  - (Stripe deferred) checkout shows "coming soon" gracefully
- [ ] Cookie consent banner shown on first visit (EU compliance)
- [ ] All legal pages reviewed for current global-multi-currency positioning

**Should be GREEN, can launch without:**

- [ ] Discord + Apple SSO (Google alone is enough for week 1)
- [ ] All custom subdomains (api.getx.live can wait if `*.railway.app` is acceptable)
- [ ] Structured data (JSON-LD) — adds in week 2

---

## 17. Day-of-launch runbook

| Time | Action | Owner |
|---|---|---|
| T-2h | Final Lighthouse run; if any score <99, abort | dev |
| T-1h | Final smoke test: signup → verify → login → /auth/me | dev + qa |
| T-30m | Confirm Sentry + UptimeRobot are receiving events | dev |
| T-15m | Take a Neon snapshot manually | dev |
| T-5m | Set Railway service to scale=1 (no surprise replicas) | dev |
| T-0 | Post launch tweet / Discord announcement | marketing |
| T+5m | Watch Railway live metrics — CPU, memory, errors | dev |
| T+15m | Hit /api/v1/health from 3 different geos | dev |
| T+30m | Check first real signups land in Neon — query `SELECT email, country, createdAt FROM "User" WHERE createdAt > now() - interval '1 hour' ORDER BY createdAt DESC LIMIT 20;` | dev |
| T+2h | Sample 3 real users — DM them, ask for friction points | marketing |
| T+24h | Review Sentry: any new error categories? Resend dashboard: bounce rate? | dev |
| T+72h | First retro — what surprised us, what fix tomorrow | team |

---

## 18. Rollback plan

If anything goes sideways:

| Symptom | Action |
|---|---|
| API returning 5xx on most requests | Railway → Deployments → click previous green deploy → Redeploy |
| Auth broken (login fails universally) | Roll Railway back; if cookies are the cause, set `COOKIE_DOMAIN=""` env (empty) + redeploy |
| Database connection saturated | Neon dashboard → scale compute up one tier; reduce `connection_limit` in Prisma URL to 5 |
| Frontend broken after Vercel deploy | Vercel → Deployments → previous production → "Promote to Production" |
| Migration corrupted DB | Neon → branch from snapshot taken at T-15m → swap branch on Railway env |
| Active attack (bot signups, etc.) | Railway → Variables → set `ALLOWED_SIGNUP_COUNTRIES=US,GB,IN` to narrow surface; enable Vercel Firewall Attack Mode |

---

## 19. Out of scope today

- Stripe live integration (deferred per user)
- Discord + Apple SSO wiring (Discord wired but secrets not set; Apple dropped pending dev subscription)
- Localization (English-only at launch)
- Native mobile app
- Real-time order updates beyond the existing socket.io chat

---

_Generated 2026-05-21. Each fix prompt above is intended to be copy-pasted into a fresh chat session to execute that specific slice — `do not leave anything` was the brief._
