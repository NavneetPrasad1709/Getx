# GETX Improvement Sprint — Detailed Prompts

**Goal:** Close every gap surfaced in the senior-marketplace-creator audit vs Eldorado.gg + ZeusX in 14 working days. Each prompt below is self-contained, file-scoped, with acceptance criteria.

**Execution model:** I run one prompt at a time. After each one ships green (typecheck clean + manual verify), we move to the next. User can re-order, skip, or stop at any point.

---

## Batch A — P0 Conversion Parity (Days 1–5)

---

### Prompt A1 — Mount HotDeals rail + wire timer countdowns

**Goal:** Surface the daily-deals rail (already built but un-mounted) on the homepage with live countdown timers. Drives return-visit frequency from 1×/week → daily.

**Files to touch:**
- `apps/web/src/app/page.tsx` — mount `<HotDeals />` between `<RecentlyViewed />` and `<PopularAccounts />`
- `apps/web/src/components/landing/hot-deals.tsx` — audit existing component, wire countdown if missing, ensure dark-band styling

**Backend:** none (use static mock data for now — backend deal table is a separate follow-up).

**UI spec:**
- Section eyebrow: `Lightning Deals` + flame icon, cobalt tint
- Headline: `Drops ending in ${nearestDealHours}h` — auto-derived from the soonest endsAt across deals
- 3-up grid (1-col mobile, 2-col tablet, 3-up desktop)
- Each card:
  - Themed placeholder image (reuse `ThemedPlaceholder` from `product-rail.tsx`)
  - Original price strike-through + sale price + discount % chip
  - `Ends in HH:MM:SS` red countdown chip (re-renders every 1s, hides when expired)
  - Stock-left bar (cobalt fill, e.g. `4 of 10 left`)
  - Seller mini-bar (avatar + handle + ★ rating)
  - `Grab now` CTA (locked verb per brand bible)
- Skeleton loader while data fetches (even if static — gives consistent UX)

**Edge cases:**
- Deal expired mid-render → card auto-hides via filter; if all expire, section unmounts
- All countdowns share one `setInterval` (1Hz) — don't spawn one per card
- Respect `useReducedMotion` — drop flame pulse animation

**Acceptance:**
- [ ] `pnpm tsc --noEmit` clean
- [ ] Section visible on `/` between Recently Viewed and Popular Accounts
- [ ] Countdown ticks every second
- [ ] Expired deals auto-disappear without page refresh
- [ ] Mobile layout: 1-col, snap-scroll horizontal optional

---

### Prompt A2 — GETX Shield insurance badge (rebrand escrow)

**Goal:** Convert "escrow protected" prose into a visual badge + framing — same product as Eldorado Shield but India-localized. Drop on every listing card, PDP, checkout, order page.

**Files to create:**
- `apps/web/src/components/shield/getx-shield-badge.tsx` — reusable badge component
  - Props: `variant: 'compact' | 'inline' | 'large'`, `showTooltip?: boolean`
  - `compact` = 18px height pill with shield icon + "Insured"
  - `inline` = ~28px height with "GETX Shield · 100% refund"
  - `large` = card-style with 3-bullet payoff (escrow / refund SLA / dispute team)
- `apps/web/src/components/shield/getx-shield-explain.tsx` — modal-friendly explainer (used in tooltip + PDP "How does it work?" link)

**Files to touch:**
- `apps/web/src/components/listings/listing-card.tsx` — add `compact` badge bottom-right of card
- `apps/web/src/components/listings/listing-detail.tsx` — drop `large` badge in BuyPanel trust block (replace 3 text bullets)
- `apps/web/src/components/landing/product-rail.tsx` (`RailProductCard`) — add `compact` badge near price
- `apps/web/src/app/orders/[id]/page.tsx` — replace generic escrow header with `inline` badge variant
- Checkout flow — wherever pay button lives, add `inline` badge next to total

**Design tokens:**
- Background: `hsl(var(--primary)/0.08)` light · `hsl(var(--primary)/0.12)` dark
- Border: `hsl(var(--primary)/0.25)`
- Icon: lucide `ShieldCheck`, cobalt `hsl(var(--primary))`
- Text: `text-[11px]` compact, `text-[13px]` inline, semibold
- Hover state on tooltip-enabled badges: ring + cursor-help

**Tooltip / modal content (3 bullets):**
1. Payment held in vault until you confirm receipt
2. 100% auto-refund if delivery fails verification
3. Median dispute close < 24 hrs · Indian support team

**Acceptance:**
- [ ] Badge renders on listing card, PDP, product rail, order page, checkout
- [ ] Tooltip shows on hover (desktop) / tap (mobile)
- [ ] Both light + dark themes correct
- [ ] No layout shift when badge mounts (reserve space)

---

### Prompt A3 — Refund SLA chip on every listing surface

**Goal:** "Median dispute close < 24 hrs" buried in `safe-trading.tsx`. Surface on every listing card + PDP as a tiny `2-hour refund` chip.

**Files to create:**
- `apps/web/src/components/shield/refund-sla-chip.tsx`
  - Default copy: `2-hr refund SLA`
  - Variants: `compact`, `inline`
  - lucide `RefreshCcw` icon
  - Tint: `success/0.12` background, success-500 text

**Files to touch:**
- `apps/web/src/components/listings/listing-card.tsx` — add next to Shield badge in card footer
- `apps/web/src/components/listings/listing-detail.tsx` — add to PDP trust block row
- `apps/web/src/components/landing/product-rail.tsx` — drop on rail cards if `urgency` slot is unused
- `apps/web/src/components/landing/hot-deals.tsx` — add to deal cards

**Edge cases:**
- Listing category = "Boosting" → swap copy to `48-hr SLA` (boosting has longer fulfillment window)
- Listing seller `isElite === true` → swap copy to `1-hr SLA` (premium tier)
- Pass `category` + `sellerTier` props so component picks correct SLA text

**Acceptance:**
- [ ] Chip visible on listing card, PDP, rails, deals
- [ ] SLA text varies by category/tier correctly
- [ ] Tabular alignment with Shield badge (same height, gap-1.5)

---

### Prompt A4 — Surface urgency on PDP BuyPanel

**Goal:** PDP currently shows price + specs but no urgency. Data exists (`stockLeft`, `soldRecent`, `endsIn`) on `RailProduct` interface — needs to be plumbed into the listing detail data shape and surfaced on `BuyPanel`.

**Files to touch:**
- `apps/web/src/hooks/use-listings.ts` — extend `Listing` interface with optional `stockLeft?: number`, `soldRecent?: number`, `endsAt?: string` (ISO)
- `apps/web/src/components/listings/listing-detail.tsx` (or wherever BuyPanel lives) — add urgency strip above price:
  - If `endsAt` and < 24hr → red countdown chip `Drop ends in HH:MM:SS`
  - Else if `stockLeft <= 5` → orange chip `Only ${stockLeft} left at this price`
  - Else if `soldRecent >= 3` → cobalt chip `${soldRecent} sold in last 24h`
  - Pick **strongest** signal only (one chip, not stacked)
- `apps/api/src/listings/*` — extend response DTO with these optional fields (if backend involvement allowed); else stub on frontend with deterministic mock derived from listing ID hash

**UI spec:**
- Chip placement: above price block in BuyPanel, h-8, full-width
- Animation: subtle pulse on red countdown only (1Hz opacity 0.85↔1)
- Respect `useReducedMotion`

**Acceptance:**
- [ ] PDP shows max 1 urgency chip
- [ ] Countdown ticks when `endsAt < 24hr`
- [ ] Falls back gracefully when no urgency data
- [ ] Mobile buy-bar (`mobile-buy-bar.tsx`) also shows chip if present

---

### Prompt A5 — Variant picker on top-ups + boosting PDPs

**Goal:** Today buyer must browse 6 separate listings for "5,500 / 14,500 / 25,000 PokéCoins". Both competitors put package radios on one page. Massive conversion lift.

**Files to touch:**
- `apps/web/src/app/games/pokemon-go/top-ups/[slug]/page.tsx` — wrap PDP in variant context
- `apps/web/src/app/games/pokemon-go/boosting/[slug]/page.tsx` — same pattern for boosting tiers
- `apps/web/src/components/listings/variant-picker.tsx` — **new** component
  - Props: `variants: Array<{ id, label, sublabel, price, originalPrice?, stockLeft?, badge? }>`, `activeId`, `onSelect`
  - Layout: vertical radio cards on desktop right rail, horizontal scroll on mobile
  - Each card: label (`5,500 PokéCoins`) + sublabel (`Most popular`) + price + strikethrough original + chip if badge
  - Active state: cobalt ring + checked dot
- `apps/web/src/hooks/use-listings.ts` — extend `Listing` with optional `variants?: ListingVariant[]` field
- Backend data: link variants by `parentListingId` or group by `productGroupId` — choose simpler model

**Behavior:**
- Selecting a variant updates: price in BuyPanel, urgency chip, "Buy now" CTA target, stock chip
- Variant ID propagates to checkout → order created against correct listing row
- Browser URL updates with `?v=<variantId>` (shallow router push) so deep-links honor selection
- Default selection: cheapest variant (or first in list)

**Edge cases:**
- Variant out of stock → grayscale card, "Out of stock" overlay, unclickable
- Only 1 variant → don't render picker, fall back to flat PDP
- Boosting variants may have different delivery ETAs — display `ETA: 6h` per card

**Acceptance:**
- [ ] Top-ups PDP shows 3+ variant radios when data present
- [ ] Boosting PDP shows tier variants (Bronze / Silver / Gold league push)
- [ ] Price updates without page reload
- [ ] Deep-link `?v=abc` lands on correct variant pre-selected
- [ ] Mobile horizontal scroll works
- [ ] Reduces 6 top-up listings → 1 PDP with picker

---

### Prompt A6 — Seller online presence + "Message seller" CTA before purchase

**Goal:** Buyer psychology — "Is this person reachable right now?" decides 40% of high-ticket purchases. Today chat opens only post-payment.

**Backend changes (`apps/api/`):**
- `User` model — add `lastSeenAt: Date` column
- `AuthMiddleware` — on every authenticated request, update `lastSeenAt` (throttle to 1× per 60s per user via Redis SETEX)
- `User` DTO — expose `lastSeenAt` on public seller view; compute derived `isOnline: lastSeenAt > now - 5min`
- WebSocket presence channel — emit `presence:user:${id}` `online` / `offline` event on socket connect/disconnect
- New chat endpoint: `POST /chat/pre-purchase` — allows buyer to open a conversation with seller for a listing **without** an order. Conversation type: `PRE_PURCHASE`. Rate-limit: 3 new pre-purchase conversations per buyer per day per seller.

**Frontend changes (`apps/web/`):**
- `apps/web/src/hooks/use-chat.ts` — add `openPrePurchaseChat(listingId)` method
- `apps/web/src/hooks/use-presence.ts` — **new** hook returning `{ isOnline, lastSeen }` for a userId, subscribes to WS channel
- `apps/web/src/components/listings/seller-card.tsx` (or wherever seller card renders in PDP) — add:
  - Green dot top-right of avatar when online
  - "Online now" text under handle (or "Last seen 2h ago" when offline)
  - "Message seller" button — opens chat in a side-sheet drawer (`/messages?conversationId=newly-created`)
- `apps/web/src/components/listings/listing-card.tsx` — small green dot indicator on seller mini-bar in rails
- `apps/web/src/components/chat/chat-window.tsx` — render pre-purchase conversation badge at top: "Pre-purchase inquiry · No order yet"

**UI spec:**
- Online dot: 8px circle, `bg-[hsl(var(--success))]`, ring-2 white, ring offset
- Offline state: gray dot, no ring
- "Last seen" format: < 1h → `Last seen Xm ago`; < 24h → `Xh ago`; else `Active recently`
- Message button: cobalt outlined, ghost-style, h-9

**Rate-limiting + abuse:**
- If buyer has no completed orders, allow only 1 pre-purchase chat per 24h site-wide
- Seller can mark conversation as "spam" → blocks buyer from opening more
- Pre-purchase conversations auto-archive after 30 days inactivity

**Acceptance:**
- [ ] Seller online dot accurate within 5min on PDP + listing cards
- [ ] "Message seller" opens chat without order
- [ ] Rate limit enforced server-side
- [ ] Existing post-payment chat flow unaffected
- [ ] WebSocket presence reconnects on network drop

---

### Prompt A7 — Image upload in messages

**Goal:** Buyer needs to share screenshots (broken account, missing item). Deal-breaker for high-ticket trades. `use-upload.ts` hook already exists.

**Files to touch:**
- `apps/web/src/components/chat/chat-window.tsx`
  - Add 📎 paperclip button left of text input → opens file picker (accept: image/*)
  - On select: show preview pill above input with thumbnail + filename + ×
  - Send button now sends `{ text, attachments: [url] }`
  - Drag-drop overlay on chat panel (highlight + "Drop to attach")
- `apps/web/src/hooks/use-upload.ts` — extend if needed for chat-specific path (`/uploads/chat/`)
- `apps/web/src/hooks/use-chat.ts` — extend `sendMessage` signature to accept `attachments?: string[]`
- Message rendering: image messages render as 200px-tall thumbnail with click→lightbox

**Backend (`apps/api/`):**
- `Message` model — add `attachments: string[]` (JSON array of uploaded URLs)
- `POST /chat/messages` — accept `attachments` field, validate each URL belongs to uploads bucket
- Storage: existing upload bucket. Max 5MB per file, max 4 files per message
- Virus scan: queue uploaded chat images through ClamAV worker (if exists) or defer to follow-up

**UI edge cases:**
- Upload in progress → show progress ring on preview thumb
- Upload failed → red X + retry button
- Non-image file → reject + toast "Only images supported"
- Multiple files → grid 2×2 in message bubble

**Acceptance:**
- [ ] Paperclip button visible in chat input
- [ ] Drag-drop works on desktop
- [ ] Mobile: tap paperclip opens camera/gallery picker
- [ ] Images render inline + clickable to lightbox
- [ ] Max-size + count limits enforced
- [ ] Existing text-only messages unaffected

---

## Batch B — Retention + India Moat (Days 6–14)

---

### Prompt B1 — Saved search + email price-drop alerts

**Goal:** Buyer leaves with no return hook today. Eldorado emails when matched listings appear or prices drop. Massive retention.

**Backend (`apps/api/`):**
- New table `SavedSearch`:
  - id, userId, name (auto-generated from filters: "PoGo accounts · Lv 45+ · ₹5k-₹20k")
  - filters: JSON snapshot of all filter params
  - emailAlerts: bool (default true)
  - createdAt, lastNotifiedAt
- `POST /saved-searches` — create
- `GET /saved-searches` — list mine
- `DELETE /saved-searches/:id`
- `PATCH /saved-searches/:id` — toggle alerts
- Cron worker (runs every 4h):
  - For each saved search with `emailAlerts=true`:
    - Re-run the query, get listings created/price-dropped since `lastNotifiedAt`
    - If ≥1 match → send email via existing transactional template
    - Update `lastNotifiedAt`
- Email template: subject "5 new matches for your Pokémon GO search", body: 3-up grid + CTA "View all matches"

**Frontend (`apps/web/`):**
- `apps/web/src/components/listings/save-search-button.tsx` — **new**
  - Renders "Save this search" button next to sort dropdown on category index pages
  - When saved → flips to "✓ Saved" + bell icon + "Manage alerts"
- `apps/web/src/app/profile/saved-searches/page.tsx` — **new**
  - List of saved searches, each row: name + filter chips + last triggered + alert toggle + delete
  - Empty state with CTA to browse
- Header sidebar — add Saved Searches link under Profile menu
- Mobile bottom nav — no change (Profile tab covers it)

**Acceptance:**
- [ ] Save button on every category index
- [ ] Saved-searches page lists + manages
- [ ] Cron job triggers email when new matches exist
- [ ] Email template renders in Gmail + Outlook + mobile mail
- [ ] Unsubscribe one-click link in email footer

---

### Prompt B2 — GETX Coins loyalty + Wallet page

**Goal:** Spend-based reward currency (₹1 cashback per ₹100 spent). Sticky for repeat purchase. Today only referrals exist; no spend loop.

**Backend (`apps/api/`):**
- New table `WalletLedger`:
  - id, userId, amount (decimal, INR), type (`CASHBACK | REFERRAL | TOPUP | SPEND | WITHDRAWAL | REFUND`), refId (orderId / referralId), createdAt, balanceAfter
- Order creation hook: on `order.status = COMPLETED` event, credit `1% of total` to buyer's wallet as `CASHBACK`
- Checkout: allow `walletAmount` to be applied (max = min(balance, total × 50%))
- `GET /wallet` → `{ balance, ledger: [...recent 50] }`
- `POST /wallet/apply` → reserve wallet amount for an order
- `POST /wallet/withdraw` → opens UPI payout request (manual approval queue for v1)

**Frontend (`apps/web/`):**
- `apps/web/src/app/profile/wallet/page.tsx` — **new**
  - Hero: current balance in big numbers, last credit timestamp
  - Tabs: All / Earned / Spent / Withdrawn
  - Ledger table with date, type chip, amount, reference (linked to order)
  - "Withdraw to UPI" CTA → opens modal with UPI ID input + amount slider
  - Earnings hint: "Earn ₹1 for every ₹100 spent. No expiry."
- `apps/web/src/hooks/use-wallet.ts` — fetch balance + ledger
- Checkout flow — add "Apply ₹X wallet credit" toggle row above payment method
- Order page — show "You earned ₹X cashback" line when COMPLETED
- Header utility cluster — small wallet pill `₹420` clickable → wallet page (only when balance > 0)
- Mobile bottom nav — wallet badge under "You" tab

**Acceptance:**
- [ ] Cashback credited within 5 minutes of order completion
- [ ] Wallet ledger paginated and accurate
- [ ] Checkout applies wallet credit correctly
- [ ] Withdraw request creates support ticket / queue entry
- [ ] Balance updates without page reload (refetch on focus)

---

### Prompt B3 — Profile settings hub `/profile/settings`

**Goal:** Today there's no settings page — password change, 2FA, KYC, addresses, notif prefs, delete account all missing. India DPDP Act requires data-export + delete.

**Files to create:**
- `apps/web/src/app/profile/settings/page.tsx` — landing with section nav
- `apps/web/src/app/profile/settings/security/page.tsx` — password change + 2FA toggle (TOTP via authenticator app)
- `apps/web/src/app/profile/settings/kyc/page.tsx` — Aadhaar number + selfie upload + status badge
- `apps/web/src/app/profile/settings/notifications/page.tsx` — channel × event matrix (email/SMS/push × orders/messages/offers/marketing)
- `apps/web/src/app/profile/settings/payment-methods/page.tsx` — saved UPI IDs, default selection
- `apps/web/src/app/profile/settings/addresses/page.tsx` — billing address book (required for GST invoice)
- `apps/web/src/app/profile/settings/privacy/page.tsx` — data export + delete account

**Backend (`apps/api/`):**
- `User.twoFactorSecret` column + `verify-2fa` endpoint
- `KYCSubmission` model + admin approval queue
- `NotificationPreferences` JSON on User
- `PaymentMethod` model (UPI ID storage, masked display)
- `Address` model
- `DataExportRequest` model — admin processes manually for v1 (zip of user JSON + orders + messages)
- `POST /account/delete` — soft-delete (sets `deletedAt`, anonymizes PII, retains order history for tax/legal)

**UI spec:**
- Sidebar nav layout: 240px left rail with section links, main content right
- Mobile: top tabs instead of sidebar
- Every section has unsaved-changes warning + save button
- KYC status badge: Pending / Verified / Rejected with admin note
- Delete account → 2-step confirm + email verification

**Acceptance:**
- [ ] All 7 settings subpages render
- [ ] Password change works + invalidates other sessions
- [ ] 2FA QR + 6-digit verify flow works
- [ ] KYC upload succeeds + status persists
- [ ] Data export emails zip within 24h
- [ ] Delete soft-deletes with 30-day grace period

---

### Prompt B4 — Re-order button + dispute trigger on order page

**Goal:** Two missing CTAs on `/orders/[id]`. Re-order adds 8-15% repeat rate. Public dispute button looks more transparent than hiding behind support.

**Files to touch:**
- `apps/web/src/app/orders/[id]/page.tsx`
  - When `status === COMPLETED`: add "Buy this again" button → creates new order against same listingId at current price
  - At every status except CANCELLED/COMPLETED: add "Open dispute" button (outlined red) → opens dispute modal
- `apps/web/src/components/orders/dispute-modal.tsx` — **new**
  - Reason picker (radio): didn't receive / not as described / credentials don't work / seller unresponsive / other
  - Description textarea (min 30 chars)
  - Evidence upload (up to 5 images via `use-upload`)
  - Submit → creates dispute ticket
  - Trust copy: "Our team reviews disputes within 6 hours. Funds remain in escrow."

**Backend (`apps/api/`):**
- `POST /orders/:id/reorder` → creates draft order, returns checkout URL
- `Dispute` model (if not exists): orderId, reason, description, evidence[], status, openedAt, resolvedAt, resolution
- `POST /orders/:id/dispute` → creates Dispute, sets order status to `DISPUTED`, notifies seller + admin
- Admin app already has moderation panel (post-P15) — wire dispute queue into it

**Edge cases:**
- Re-order: if listing no longer available → toast "Listing sold out — view similar" → links to category search
- Dispute already open → button changes to "View dispute" → links to dispute detail
- Auto-release timer (3 days) pauses while dispute open

**Acceptance:**
- [ ] Both buttons visible per correct status
- [ ] Re-order flow lands on checkout with line item pre-filled
- [ ] Dispute submission creates ticket + freezes auto-release
- [ ] Email notification sent to seller within 1 minute

---

### Prompt B5 — GST invoice PDF on completed orders

**Goal:** India-specific. Streamers, gaming orgs, content creators need GST invoices for ITC claims. Neither competitor offers this. Pure moat.

**Backend (`apps/api/`):**
- New module: `invoice/` with `InvoiceService`
- On `order.status = COMPLETED` event: generate invoice number `GETX/YYYY-YY/MMM/####` (sequential per fiscal year), store on Order
- Generate PDF using `@react-pdf/renderer` or `puppeteer` from server-side template
- Fields:
  - Buyer name + address (from address book)
  - Seller GSTIN (only for `MERCHANT_SELLER` tier; for `INDIVIDUAL_SELLER` skip GST line and note "Sold via GETX Marketplace · Deccanport Technologies Pvt Ltd · GSTIN 07AAJCD9100M1Z2")
  - Line items: listing name + HSN/SAC code `998363` (online gaming services)
  - Subtotal, GST 18%, total
  - Payment method, transaction ID, escrow release date
- `GET /orders/:id/invoice` → streams PDF
- Cache generated PDFs in S3/local bucket; regenerate only if data changes

**Frontend (`apps/web/`):**
- `apps/web/src/app/orders/[id]/page.tsx` — when `status = COMPLETED`: add "Download GST invoice" button (outline + download icon)
- Toast on download: "Invoice ready · check your downloads"
- Mobile: same button, native browser download
- Email transactional template (order completion) — include invoice as PDF attachment

**Acceptance:**
- [ ] Invoice generates within 5s of order completion
- [ ] PDF renders correctly in Acrobat + mobile preview
- [ ] Invoice number is sequential per fiscal year
- [ ] Includes buyer billing address (prompts to fill if missing)
- [ ] Auto-attached to completion email

---

### Prompt B6 — WhatsApp Business chat widget

**Goal:** India default chat channel. Neither competitor offers. Pure India moat. Floating button replaces or augments existing live-chat-bubble.

**Files to touch:**
- `apps/web/src/components/support/live-chat-bubble.tsx` — extend with WhatsApp option in the menu
  - Existing menu: in-app chat, email support
  - Add: "WhatsApp · 10am-11pm IST" with WhatsApp icon
- Click handler: opens `https://wa.me/91XXXXXXXXXX?text=${encodeURIComponent(prefilledMsg)}`
- Prefilled message includes: order ID (if on order page), page URL, user ID

**Environment:**
- `NEXT_PUBLIC_WHATSAPP_NUMBER` — set in `.env.local`, fallback to placeholder
- Show "WhatsApp" option only if env var set (graceful fallback)

**WhatsApp Business setup (ops side, document in `LAUNCH.md`):**
- Create WhatsApp Business account
- Apply for Business Verification (green check)
- Set up auto-greeting message
- Configure away-message outside support hours
- Optional: WhatsApp Business API + chatbot via Twilio/MessageBird (v2)

**UI spec:**
- WhatsApp tile: green `#25D366` icon background, gray-50 hover background
- Status pill: green dot + "Online now" during 10am-11pm IST, gray + "Reply in ~1h" outside
- Time-of-day derived client-side from `Asia/Kolkata` timezone

**Acceptance:**
- [ ] WhatsApp option visible in support menu
- [ ] Click opens WhatsApp app/web with prefilled message
- [ ] Online/offline status accurate by IST time
- [ ] Mobile: opens WhatsApp app directly
- [ ] Desktop: opens web.whatsapp.com

---

### Prompt B7 — Aadhaar-verified seller tier

**Goal:** Trust signal above plain KYC. Foreigners can't fake this. Surface on every seller card.

**Backend (`apps/api/`):**
- `User.aadhaarVerified: boolean` column + `aadhaarVerifiedAt: Date`
- Verification flow:
  - Seller submits Aadhaar via `/profile/settings/kyc`
  - Integration: Cashfree Aadhaar Verify API (or similar — DigiLocker e-KYC)
  - On success → set `aadhaarVerified = true`
  - Manual fallback: admin reviews + flips boolean
- New "tier" tier above EXISTING tiers: `AADHAAR_VERIFIED` (additive — can be on top of `ELITE` etc.)

**Frontend (`apps/web/`):**
- `apps/web/src/components/badges/aadhaar-badge.tsx` — **new**
  - Saffron/green/white tricolor accent on a shield outline
  - Tooltip: "Identity verified via Aadhaar e-KYC. Linked to a real Indian citizen."
  - Sizes: `xs` (12px), `sm` (16px), `md` (20px)
- Drop on:
  - `SellerCard` in PDP (right of name, before tier badge)
  - `SellerBar` in listing-card / product-rail (compact)
  - `/users/[username]` public seller page (large with explainer)
  - `top-sellers.tsx` cards
- Filter: add "Aadhaar-verified only" toggle on category index pages

**Acceptance:**
- [ ] Badge renders for sellers with flag set
- [ ] Filter narrows results to Aadhaar-verified only
- [ ] Aadhaar submission flow works end-to-end (or stubbed for v1)
- [ ] Tooltip explains what verification means
- [ ] Mobile-friendly badge sizing

---

### Prompt B8 — Pre-register modal on coming-soon game tiles

**Goal:** Today coming-soon tiles ([coming-soon-games.tsx](apps/web/src/components/landing/coming-soon-games.tsx)) just display. Should capture email intent. Wasted funnel.

**Backend (`apps/api/`):**
- New table `GameWaitlist`:
  - id, email (or userId if authed), gameSlug, source (homepage / search / link), createdAt
- `POST /waitlist` → upsert by `email + gameSlug`
- Cron: on game launch → send "We're live!" email to all on waitlist + auto-apply `WELCOME` promo code (₹100 wallet credit)
- Admin can view waitlist counts per game in admin app

**Frontend (`apps/web/`):**
- `apps/web/src/components/landing/coming-soon-games.tsx` — wrap each tile in a click-to-open modal trigger
- `apps/web/src/components/waitlist/waitlist-modal.tsx` — **new**
  - Headline: "Be first when Roblox lands · ₹100 wallet credit on launch"
  - If authenticated → 1-click "Add me to waitlist" button (prefilled with logged-in email)
  - If anonymous → email input + "Notify me" button
  - Success state: green tick + "You're on the list · 1,247 trainers ahead of you" (count pulled from API)
  - Optional: "Also notify me by WhatsApp" toggle (collects phone)
- Hero CTA on each tile updates from "Coming Soon" → "Get notified" with bell icon
- After signup: localStorage flag `getx.waitlist.${gameSlug}` prevents re-prompt

**Acceptance:**
- [ ] Modal opens on tile click
- [ ] Email captured server-side
- [ ] Duplicate emails handled idempotently
- [ ] Success state shows correctly
- [ ] Authenticated users get 1-click flow
- [ ] WhatsApp opt-in respected

---

## Sprint summary

| Day | Prompt | Effort | Impact |
|---|---|---|---|
| 1 AM | A1 — HotDeals mount | 2h | High |
| 1 PM | A2 — GETX Shield badge | 3h | High |
| 1 PM | A3 — Refund SLA chip | 2h | Med |
| 2 AM | A4 — PDP urgency surface | 3h | High |
| 2-3 | A5 — Variant picker | 1.5d | Very High |
| 3-4 | A6 — Seller presence + pre-buy chat | 1.5d | Very High |
| 5 | A7 — Image upload in chat | 1d | High |
| 6-7 | B1 — Saved search + alerts | 2d | Very High retention |
| 8-9 | B2 — Wallet + cashback | 2d | Very High retention |
| 10 | B3 — Settings hub | 1d (skeleton) + iterate | Med (unblocker) |
| 11 AM | B4 — Reorder + dispute buttons | 4h | Med |
| 11 PM | B5 — GST invoice | 4h | High (India moat) |
| 12 AM | B6 — WhatsApp widget | 2h | High (India moat) |
| 12 PM | B7 — Aadhaar tier | 3h | High (India moat) |
| 13 | B8 — Waitlist modal | 1d | High (P0 funnel) |
| 14 | Buffer / QA / fixes | 1d | — |

---

## Execution rules

1. **One prompt at a time.** No batching — each ships independently and is verifiable.
2. **`pnpm tsc --noEmit` must be clean before moving to next.**
3. **Manual browser verify** for every UI-visible prompt — checked off in user-facing reply.
4. **Backend prompts** — if API changes touch `apps/api/`, write Nest module + run `pnpm tsc --noEmit` for the API workspace too.
5. **Reuse design tokens** from `packages/ui/src/styles/globals.css` — no hardcoded hex.
6. **Mobile + dark theme** verified on every visible prompt (we've shipped both correctly so far).
7. **Don't touch existing files outside the prompt's stated scope.**
8. **Commit per prompt** — message format: `feat(<area>): <prompt-id> · <one-line summary>`. Don't commit unless user says ship.

---

## Decision point

Pick where to start:

- **A1 (HotDeals mount)** — fastest win, already-built component, 2h.
- **A2 (Shield badge)** — biggest perceived-value lift sitewide, 3h.
- **A5 (Variant picker)** — biggest single conversion lift, 1.5d.
- **B6 (WhatsApp widget)** — fastest India moat ship, 2h.
- **Pick a custom order.**
