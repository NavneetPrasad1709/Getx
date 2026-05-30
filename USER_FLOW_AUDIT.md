## GETX — End-to-End User-Journey Audit (Senior UX Researcher, read-only)

Scope: every buyer, seller, and admin journey traced through real code in `apps/web`, `apps/seller`, `apps/admin`, and the NestJS controllers/services backing each step. Every finding below cites the exact file + line and the actual code. Where a control is correctly built, it is acknowledged. Where confirmation needs runtime, the precise test is named.

### Executive summary

The product is, in code, far more complete than the reported breakages suggest. The catalog, browse, filter, product, order, escrow, chat, and dashboard flows are well-engineered. **Almost every reported "breakage" is a configuration/launch-gate problem, not broken React/Nest logic.** Five issues dominate the real-world experience:

1. **Login & signup "failing"** is overwhelmingly explained by two things working together: (a) the hard email-verification gate on login (`auth.service.ts:362-364`) combined with the mail service silently degrading to console-logging when `RESEND_API_KEY` is absent (`mail.service.ts:16-23, 276-284`) — users never receive the OTP, so they can never verify, so login is refused; and (b) the production env templates pointing `NEXT_PUBLIC_API_URL` at the **absolute cross-origin** API host (`apps/web/.env.production.example:4`), which defeats the same-origin Next rewrite proxy the entire cookie/Safari-ITP architecture depends on — the login request 200s but the `sameSite=lax` cookie never sticks.
2. **"Seller buttons on the homepage not working"** is confirmed: the header Tier-3 CTA and the landing `ForSellers` CTA hardcode `http://localhost:3001` as their fallback (`header.tsx:1753`, `for-sellers.tsx:68`), so if `NEXT_PUBLIC_SELLER_URL` is missing at web build time they point at localhost in production. The same component family already has the correct safe fallback (`sellerUrl ?? '/sellers/program'`, `header.tsx:1269`) — it just isn't used consistently.
3. **"Seller dashboard not opening"** traces to the seller env: `apps/seller/.env.example:1` is `http://localhost:4000` **without `/api/v1`**, so a dev who copies the template hits `localhost:4000/auth/session` (404) and the middleware fail-closes to the web login — the dashboard never renders.
4. **The buyer can never actually buy.** Checkout is globally gated off by default (`feature-flags.ts:10-11`, `NEXT_PUBLIC_CHECKOUT_DISABLED !== 'false'`). Every "Buy"/"Pay" button shows a "Checkout opens in a few days" toast.
5. **The seller can never get paid.** KYC verification has no working UI (the Sumsub WebSDK is never embedded — `kyc/page.tsx` fetches a token and drops it; no `@sumsub/websdk` dependency exists), there is no admin "mark KYC verified" endpoint, and withdrawals are separately gated off (`NEXT_PUBLIC_PAYOUTS_LIVE`, seller `wallet/page.tsx:202-218`). Money flows in via escrow but has no exit.

### Buyer journey

| Step | State | Evidence |
|---|---|---|
| Landing → browse | Works | `app/page.tsx` renders hero + `ForSellers`; `games/pokemon-go/accounts/page.tsx` is a complete filter/sort/paginate browse with mobile sheet + a11y |
| Signup | Works in code, blocked by mail config | `register/page.tsx` contract matches `RegisterSchema`; OTP send is fire-and-forget and degrades to console log without Resend |
| Email verify | Works in code, blocked by mail config | `verify-email/page.tsx` + `auth.service.verifyEmail`; OTP only reaches the user if Resend is configured |
| Login | Works in code, blocked by verify-gate + cross-origin cookie | `login/page.tsx` → `/auth/login`; refused while `!emailVerified` (`auth.service.ts:362`) |
| Search / filter / PDP | Works | `search/page.tsx` federated search; `accounts/[slug]/page.tsx` PDP with JSON-LD, gallery, spec sheet |
| Add to cart / checkout | **Disabled** | `gateCheckout` toast on all 3 PDP types + drawer + order page |
| Order tracking / confirm receipt / dispute | Works | `orders/[id]/page.tsx` + `use-orders.ts`; escrow release is atomic + idempotent (`orders.service.ts:451-455`) |
| Boosting purchase | Works (request-for-offers, not direct checkout) | `boosting/[serviceSlug]/page.tsx` posts a custom request, bypassing the checkout gate by design |

Buyer friction beyond the launch gates is low. The one structural risk: because checkout is disabled, a logged-in buyer who reaches a PDP, clicks Buy, and gets a "coming soon" toast has **no fallback path to register interest** beyond a generic message.

### Seller journey

| Step | State | Evidence |
|---|---|---|
| Discover "Sell on GetX" from homepage | **Broken in prod if env missing** | `header.tsx:1753` + `for-sellers.tsx:229` hardcode `localhost:3001` |
| Reach seller app | Works, env-fragile | `seller/middleware.ts` server-side session gate; fail-closed to web login |
| Become a seller | Works | `page.tsx` ActivateBanner → `PATCH /auth/me/activate-seller` → `auth.service.activateSeller` |
| Create / edit listing | Works | `listings/new/page.tsx` 5-step wizard → `POST /listings`; `listings.controller.ts` |
| Manage orders / deliver | Works | seller `orders` + `use-seller-orders` |
| KYC for payouts | **Dead-end** | `web .../kyc/page.tsx` and seller `profile/page.tsx:175` both show "widget coming soon"; no Sumsub SDK installed |
| Connect payout (Stripe) | Works (onboarding link) | `use-wallet.ts` `useStartPayoutOnboarding` → `/payouts/connect/start` |
| Withdraw earnings | **Disabled + blocked by KYC** | `wallet/page.tsx:202-218` gated by `NEXT_PUBLIC_PAYOUTS_LIVE`; backend requires `kycStatus==='VERIFIED'` (`wallet.service.ts:335`) which is unreachable |

The seller can list, sell, deliver, and accrue escrowed earnings — but the **cash-out journey has three independent blockers**, any one of which traps the money. Even with a fully verified intent, there is no UI to complete KYC and no admin override.

### Admin journey

| Step | State | Evidence |
|---|---|---|
| Login | Works | `admin/auth/login/page.tsx` forces `rememberMe:true` |
| Role gate | Works | `admin/middleware.ts` server-side ADMIN/SUPER_ADMIN check |
| Dashboard / users / orders / listings / reviews / audit logs | Works | `admin-shell.tsx` nav + `use-admin.ts` Zod-validated responses |
| Ban/unban, force-release, refund, resolve dispute, hide listing/review | Works | `admin.controller.ts:85-197` |
| **Withdrawals queue** | **No UI** | Backend has `GET /admin/withdrawals` + approve/reject (`admin.controller.ts:208-223`) but `admin-shell.tsx` NAV_SECTIONS has no Withdrawals entry and no `/withdrawals` page exists |
| **Mark KYC verified** | **Missing entirely** | No KYC mutation route in `admin.controller.ts`; only Sumsub webhook can set VERIFIED |

Admin is the most internally-consistent of the three apps, but it is missing the two operational screens (withdrawals approval, KYC override) that the seller money-out flow depends on.

### Root-cause cluster: environment & domain configuration

Several "broken flows" share one root: the env templates are stale and self-inconsistent, and they fight the same-origin proxy architecture.

- `NEXT_PUBLIC_API_URL` is set to the **absolute cross-origin** API (`https://api.getx.gg/api/v1`) in both web and seller prod templates, while the entire cookie design (`api.ts` baseURL `/api/v1`, Next `rewrites`, `sameSite=lax`) requires it to be **unset** so calls stay same-origin. Recent commits (`0b54a2d`, `2ef13ba`) confirm the intended fix is the rewrite proxy, not the absolute URL.
- Domain mismatch: templates use `getx.gg`; code, CSP `connect-src` (`api.getx.live`), and commit `16628ad` use `getx.live`. The CSP would block a direct XHR to `api.getx.gg`.
- Seller `.env.example` drops the `/api/v1` suffix, guaranteeing 404s for any dev who uses it.
- Two launch flags (`NEXT_PUBLIC_CHECKOUT_DISABLED`, `NEXT_PUBLIC_PAYOUTS_LIVE`) that gate the two most important revenue flows are documented in **no** env file.

### Prioritised recommendations

1. **Unblock auth**: make Resend presence a boot check in prod (or add a visible "email not configured" banner in non-prod), and surface a clearer login error than "Invalid credentials" when the only failing gate is `!emailVerified` (audit already records the real reason). Correct/clarify `NEXT_PUBLIC_API_URL` guidance to "leave unset in prod; rely on rewrites."
2. **Fix seller CTAs**: replace the two hardcoded `localhost:3001` fallbacks with the existing `sellerUrl ?? '/sellers/program'` pattern so a missing env degrades gracefully instead of dead-linking.
3. **Fix seller `.env.example`** to include `/api/v1` and align all templates to `getx.live`.
4. **Decide the checkout/payout launch story explicitly**: document both flags, and when enabling, ship the Sumsub WebSDK widget + an admin KYC-override + an admin Withdrawals page in the same release, or the seller will sell and never be paid.
5. **Add an admin Withdrawals nav item + page** to consume the endpoints that already exist.

Scores reflect "does the journey work for a real user end-to-end on a correctly-deployed instance, weighting the steps that block revenue."
