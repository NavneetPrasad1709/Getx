## GETX — Senior Product Designer Audit (web / seller / admin)

**Scope:** `apps/web/src`, `apps/seller/src`, `apps/admin/src`, `packages/ui`. Read-only. Benchmarked against Eldorado.gg, ZeusX, PlayerAuctions, G2G.

**Headline verdict:** The design system is genuinely strong — a single token source (`packages/ui/src/styles/globals.css`), consistent HSL theming, a refined component library, thoughtful mobile bottom-sheets, real `prefers-reduced-motion` handling (55 references), a skip link, and honest "early access" framing in the hero. This is well above typical AI-generated quality. The problems are concentrated, not pervasive: (1) the **homepage's primary product grid is entirely fabricated** and links to 404s, undermining trust on the most important page; (2) **the skip link only works on 1 of 34 pages** and seller/admin have no landmark/skip link at all; (3) a **dead design-system class pair** (`duration-ui`/`ease-apple`) silently no-ops the intended motion timing across every Button/Input/Card/Badge; (4) **India-specific UPI rails contradict the documented global USD-primary pivot**; (5) the **admin header search is a non-functional decoration.**

---

### What is genuinely well done (acknowledged)

| Area | Evidence |
|---|---|
| Token system | One source of truth, HSL triplets composed with alpha, light+dark parity, `--muted-foreground` deliberately bumped to 92% L in dark mode for body-copy contrast (`globals.css:86-90`). |
| Form a11y | `FloatingInput` (`packages/ui/src/components/input.tsx`) correctly wires `id`/`htmlFor`, `aria-invalid`, `aria-describedby`, required indicator, 16px mobile font to defeat iOS zoom. |
| Login flow | `apps/web/src/app/auth/login/page.tsx` — zod validation, 429 cooldown countdown, OAuth error toasts, open-redirect guard, show/hide password with aria-label. Best-in-class. |
| Commerce IA | Browse page (`accounts/page.tsx`) has breadcrumbs, sticky desktop filters, mobile filter bottom-sheet with Escape + scroll-lock, skeletons, empty/error states, "showing X–Y of N". On par with Eldorado. |
| Checkout drawer | Clear price breakdown, escrow/refund trust list, SSL chip, bfcache reset for the Stripe round-trip (`checkout-drawer.tsx`). |
| Honest hero | Fake counters were deliberately removed and replaced with verifiable promise strips + "Early access · launching now" (`hero-section.tsx:322`). |
| Seller/admin dashboards | Single-story top-to-bottom layout, "do this next" focus card, count-up KPIs, pipeline funnel. ZeusX-clean. |

---

### Critical & High findings (full detail in issues[])

**1. Homepage "Featured drops" grid is 100% fabricated and links to 404s (UIUX-001, Critical).**
`hero-section.tsx:46-95` hardcodes `FEATURED_DROPS` — 4 listings with fake countdown timers (`07:45:24`), fake slot-fill bars ("15/24 taken · 62%"), fake strike-through discounts, and `href={/games/pokemon-go/accounts/${drop.id}}` pointing to slugs like `lv50-mystic-hundo` that resolve to "Listing not found" (`accounts/[slug]/page.tsx:56-72`). The team scrubbed fake numbers from the announcement bar (`header.tsx:99`) and hero stats (`hero-section.tsx:322`) but left the largest fabricated surface — the homepage product showcase — intact. **Why it matters:** for a real-money marketplace, a buyer who clicks the most prominent "drop" and hits a dead page learns the listings aren't real. Eldorado/G2G never show non-clickable phantom inventory. This is the #1 conversion-and-trust blocker.

**2. Skip-to-content link is broken on 33 of 34 pages (UIUX-002, High).**
`layout.tsx:107` ships a proper skip link targeting `#main`, but only the homepage gives `<main id="main">` (`page.tsx:119`). `how-it-works/page.tsx:77`, `games/page.tsx:41`, and 31 others use a bare `<main className="flex-1">`. Keyboard/AT users who activate "Skip to main content" land nowhere. **Fix:** add `id="main"` to every page's `<main>` (or move the landmark into a shared shell).

**3. Seller & admin apps have no skip link and no labelled main landmark (UIUX-003, High).**
`admin-shell.tsx:374` renders `<main className="flex-1 min-w-0">` with no `id`; there is no skip link in seller/admin layouts. Every keyboard user must tab through the entire sidebar (and on admin, the dead search) on every navigation. WCAG 2.4.1 (Bypass Blocks) failure on the most security-sensitive surface.

**4. `duration-ui` / `ease-apple` classes are undefined — motion timing silently lost system-wide (UIUX-004, High).**
`button.tsx:13`, `input.tsx:14/91/107`, `card.tsx:5/15`, `badge.tsx:9` all use `transition-all duration-ui ease-apple`, and ~15 page files reference them too. Neither token exists in `packages/ui/tailwind.config.ts` (no `transitionDuration`/`transitionTimingFunction` extension) nor in any CSS `@theme`/`:root`. Tailwind drops unknown utilities, so every shared primitive falls back to the browser default transition timing instead of the intended "Apple" easing. The product still animates (via `transition-all`'s 150ms default) so it's invisible in casual testing, but the carefully-chosen motion personality never ships. **Fix:** define `transitionDuration.ui` and `transitionTimingFunction.apple` in the Tailwind config.

**5. Admin desktop header search is a non-functional control (UIUX-005, High).**
`admin-shell.tsx:349-353` renders `<input type="search" placeholder="Search users, orders, listings…">` with **no `value`, `onChange`, `onSubmit`, or form**. It looks like the global admin search but does nothing. Admins will type a user email, press Enter, and watch the page reload/clear. A dead primary control on an ops console erodes operator trust and wastes time. **Fix:** wire it to the existing `/users`/`/orders` search, or remove it until built.

---

### Medium findings

**6. UPI / India-first rails contradict the global USD-primary pivot (UIUX-006, Medium).** Live (not commented-out) code: `how-it-works/page.tsx:188` "Withdraw to UPI, bank or PayPal"; `profile/wallet/page.tsx:178,308-318,506` offers a "UPI · India · min $1.20" withdrawal method and defaults to it for INR; `profile/payouts/page.tsx:248` lists "UPI (India) · Always on"; `buyer-faq.tsx:102` leads regional rails with UPI. Per the documented 2026-05-15 pivot, GETX is global USD-primary and explicitly dropped UPI/Aadhaar/GST moats. Surfacing India-specific rails as first-class (and as a withdrawal default) is an IA/positioning inconsistency that reads as a half-finished pivot to a global audience.

**7. Unsubstantiated social proof on how-it-works ("Join thousands…") (UIUX-007, Medium).** `how-it-works/page.tsx:203` "Join thousands of buyers and sellers trading safely on GETX." The team removed exactly this kind of claim from the hero and announcement bar at launch but missed this page. Inconsistent honesty is itself a trust signal — a skeptical buyer who saw "Early access · launching now" in the hero will distrust "thousands" here.

**8. Form-validation errors are not announced to screen readers (UIUX-008, Medium).** `FloatingInput`'s error `<p id={descId}>` (`input.tsx:135`) is wired via `aria-describedby` but has no `role="alert"`/`aria-live`, so a failed submit (which only updates the error text, no focus move) is silent for AT users. Toasts are fine (sonner has built-in live regions), but inline field errors are not. Add `role="alert"` to the error paragraph. (No `role="alert"`/`aria-live` appears in `packages/ui` form components.)

**9. Hardcoded "trending searches" in header autocomplete (UIUX-009, Low/Medium).** `header.tsx:168 TRENDING_SEARCHES` is a static list ("Lv 50 Hundo Mewtwo", "Shiny Charizard"…). Live federated results are correctly wired (`useSearchListings` etc.), but the empty-state "trending" chips are fictional. Lower stakes than the homepage grid, but same class of issue — drive these from real popular queries or relabel as "Try searching."

**10. CTA-verb and visual-weight inconsistency (UIUX-010, Medium).** The product bible locks CTA verbs (Get/Grab/Drop/Cash Out…), but surfaces mix freely: hero "Browse drops" vs header "Get started" vs how-it-works "Browse marketplace"/"Create an account" using the generic shared `<Button>`. Separately, the global `<Button default>` is `uppercase tracking-wider font-bold` (`button.tsx:24`) while the hero and header CTAs are bespoke gradient pills with sentence case — so the same logical action looks different depending on which component rendered it. Consolidate the primary CTA into one styled variant so buttons read as one system.

**11. Admin/seller ship no Content-Security-Policy (UIUX-011, Medium — trust).** `apps/admin/next.config.mjs` (and seller) set `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` but **no CSP**, whereas web ships a full one. The admin app handles bans, payout approvals, and audit logs — it is the highest-value XSS target and the one most in need of `script-src`/`connect-src` lockdown. (Flagged in the infra map; reconfirmed in scope because it directly governs the trustworthiness of the admin surface.)

---

### Low / Info

- **UIUX-012 (Low):** Bespoke interactive `<button>`/anchor elements rely on the global `:focus-visible` ring from `globals.css:182`, which is good — but the admin/seller filter inputs use `focus:ring-primary/35` (35% alpha) on a `bg-muted/25` field (`admin/users/page.tsx:109`), a faint focus indicator that may fail WCAG 2.4.11 non-text contrast. Verify the focus ring meets 3:1 against the field background.
- **UIUX-013 (Info):** Admin data uses card-rows, not semantic `<table>` (`users/page.tsx:217`). Defensible for responsive design, but for dense ops data (users/orders) a real `<table>` with `<th scope>` gives AT users column context and lets admins sort. Consider for high-volume views.
- **UIUX-014 (Info):** Emoji used as meaningful UI without text alternative — `listing-card.tsx:242` "💯 {hundo}", "⚡ {legendary} legendary", and `⬡` fallback glyphs. Screen readers announce emoji names ("hundred points symbol"). Wrap decorative emoji in `aria-hidden` and keep the adjacent number/label as the accessible name.

---

### How GETX compares to the benchmark set

| Dimension | GETX | Eldorado / ZeusX / G2G | Gap |
|---|---|---|---|
| Visual polish | Premium, cohesive, modern | Functional, dated (Eldorado) | **GETX ahead** |
| Real inventory on landing | Fabricated grid → 404s | Always live, clickable | **GETX behind** (UIUX-001) |
| Trust signaling | Escrow/refund copy strong; but mixes honest + "thousands" | Volume/review counts (real) | Mixed |
| Search | Live federated + ⌘K | Live | Parity (drop fake trending) |
| Accessibility | Good primitives, broken landmarks/skip | Generally weak | Parity, fixable cheaply |
| Mobile | Excellent bottom-sheets, bottom-nav, 16px inputs | Adequate | **GETX ahead** |

**Top 5 to ship first:** (1) replace homepage fake grid with live listings or remove it; (2) add `id="main"` everywhere + skip links to seller/admin; (3) define `duration-ui`/`ease-apple` in Tailwind; (4) wire or remove the admin search; (5) reconcile UPI copy with the global positioning.
