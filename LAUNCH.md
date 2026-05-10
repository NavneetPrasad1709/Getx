# GETX Launch Guide

End-to-end checklist for taking GETX from this repo to production at
**getx.gg / sell.getx.gg / admin.getx.gg / api.getx.gg**.

> Daily operations live in [`RUNBOOK.md`](./RUNBOOK.md). This doc is the
> first-time deploy.

## 0. Architecture recap

```
Vercel (3 projects)              Railway / Render        Neon Postgres
─────────────────────            ──────────────────      ──────────────
apps/web    → getx.gg     ─┐                            (managed)
apps/seller → sell.getx.gg ─┼─→ apps/api → api.getx.gg ─→  pooled URL
apps/admin  → admin.getx.gg ┘     (NestJS + Socket.io)     direct URL
                                                            │
                                                            └─ migrations
```

Realtime chat uses WebSocket on the API host. Make sure the chosen
backend host supports persistent connections — both Railway and Render
do; Vercel **Serverless Functions don't**, so the API can't run there.

## 1. Domain + DNS

- [ ] Register `getx.gg` (Namecheap, Porkbun, Cloudflare Registrar)
- [ ] DNS records:
  - `@` A → Vercel (`76.76.21.21`)
  - `www` CNAME → `cname.vercel-dns.com`
  - `sell` CNAME → `cname.vercel-dns.com`
  - `admin` CNAME → `cname.vercel-dns.com`
  - `api` CNAME → Railway/Render hostname (provided after deploy)
- [ ] SSL certs auto-issued (Vercel + Railway/Render)
- [ ] Email DNS records (SPF, DKIM, DMARC) for the Resend sending domain

## 2. Provider accounts

- [ ] **Vercel** — 3 projects, one per Next app
- [ ] **Railway** _or_ **Render** — one project for the API
- [ ] **Neon** — production project (separate from the dev project)
- [ ] **Resend** — API key + verified `getx.gg` sending domain
- [ ] **Cloudflare R2** — bucket `getx-uploads` (when ready; until then
      the upload service falls back to base64 data URLs)
- [ ] **Paddle** — sandbox + production accounts (set keys later)
- [ ] **Sentry** _(optional)_ — DSN for the API

## 3. Environment variables

Templates live next to each app:

```
apps/api/.env.production.example
apps/web/.env.production.example
apps/seller/.env.production.example
apps/admin/.env.production.example
```

Generate fresh secrets locally **before pasting into hosting dashboards**:

```bash
# JWT secrets — run twice, use two different values
openssl rand -base64 48

# PII encryption key (32-byte hex)
openssl rand -hex 32

# Initial admin password
openssl rand -base64 24
```

### Critical `apps/api` vars (Railway/Render dashboard)

| Var                                        | Notes                                                                                              |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                             | Neon **pooled** URL with `pgbouncer=true&connection_limit=10&pool_timeout=20`                      |
| `DIRECT_URL`                               | Neon **non-pooled** URL — required for `prisma migrate deploy`                                     |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Two **different** 48-byte randoms                                                                  |
| `COOKIE_DOMAIN`                            | `.getx.gg` (cross-subdomain SSO)                                                                   |
| `WEB_URL` / `SELLER_URL` / `ADMIN_URL`     | `https://...getx.gg` — gates CORS + WebSocket origins + OAuth redirects                            |
| `RESEND_API_KEY`                           | Leave blank to console-log emails (acceptable for closed beta)                                     |
| `R2_*`                                     | Leave blank for base64 fallback (acceptable for closed beta)                                       |
| `PADDLE_API_KEY`                           | **Leave blank** until you're ready for real payments — mock provider keeps the order flow testable |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Read once during seed; rotate the password right after first login                                 |

The API **fails fast at boot** in production if any of `DATABASE_URL`,
`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `WEB_URL`, `SELLER_URL`,
`ADMIN_URL` are missing — see `apps/api/src/main.ts`.

### Frontend (Vercel)

Each Next app needs `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WEB_URL`, and
its own `NEXT_PUBLIC_SITE_URL`. See per-app `.env.production.example`.

## 4. Database deploy

Run from a machine that can reach Neon (your laptop or a Railway shell):

```bash
# Apply migrations
DATABASE_URL=<prod-pooled> DIRECT_URL=<prod-direct> \
  pnpm --filter @getx/database deploy:prod

# Idempotent prod seed — creates Pokemon GO + Roblox-stub games and
# the first SUPER_ADMIN if SEED_ADMIN_PASSWORD is set.
DATABASE_URL=<prod-pooled> SEED_ADMIN_EMAIL=admin@getx.gg \
  SEED_ADMIN_PASSWORD=<random> \
  pnpm --filter @getx/database seed:prod
```

Verify in Neon's SQL editor:

```sql
SELECT slug, name, "isActive", "isLaunched" FROM "Game";
SELECT email, role, "emailVerified" FROM "User" WHERE role IN ('ADMIN','SUPER_ADMIN');
```

## 5. Frontend deploy (Vercel)

For each of `apps/web`, `apps/seller`, `apps/admin`:

1. New Project → Import Git Repository → root `apps/<name>`
2. Vercel auto-detects Next.js. The repo's `vercel.json` overrides the
   build command to install from the monorepo root + generate the Prisma
   client + build.
3. Set environment variables (see step 3).
4. Add the production domain (`getx.gg` / `sell.getx.gg` / `admin.getx.gg`).
5. Push to `main` → auto-deploy.

## 6. API deploy (Railway recommended)

Railway:

1. New Project → Deploy from GitHub.
2. Railway picks up `apps/api/railway.toml`.
3. Set env vars from step 3.
4. After first successful build: set the custom domain `api.getx.gg`.
5. Healthcheck path is already `/api/v1/health` — Railway will mark
   the deploy ready when this returns 200.

Render alternative: same shape, picks up `apps/api/render.yaml`.

> **Realtime chat note**: Railway and Render both keep persistent
> connections alive. The Socket.io client connects with
> `withCredentials: true` and `transports: ['websocket', 'polling']`,
> so polling fallback works even if WebSocket gets blocked.

## 7. Activate real payments (when ready)

Default state: mock provider — the checkout flow renders a fake page
that 302s back as if Paddle paid. Useful for closed beta.

To switch on real money:

1. dashboard.paddle.com → API key → copy
2. Generate webhook secret in Paddle
3. Set `PADDLE_API_KEY` + `PADDLE_WEBHOOK_SECRET` in API env
4. In Paddle dashboard, configure webhook URL:
   `https://api.getx.gg/api/v1/payments/webhook`
5. Redeploy the API (Railway/Render auto-deploys on env change)
6. Test with a $1 transaction → refund yourself
7. Open the gates publicly

## 8. Monitoring + observability

Minimum viable monitoring:

- [ ] **Health endpoints respond**: hit `/api/v1/health` and
      `/api/v1/health/deep` from a public location
- [ ] **Uptime ping** — UptimeRobot or Better Stack free tier polls
      `/api/v1/health` every minute
- [ ] **Error tracking** — set `SENTRY_DSN` if you're using Sentry
      (the API SDK is opt-in, controlled by env)
- [ ] **Dashboards** — Neon dashboard (DB metrics), Railway/Render
      dashboard (CPU/memory/logs), Vercel dashboard (frontend traffic)

## 9. Legal / compliance

- [ ] `/terms`, `/privacy`, `/refund` pages published — replace the
      placeholder copy in those files with lawyer-reviewed text
- [ ] India: DPDP Act 2023 compliance check
- [ ] India: GST registration (mandatory above ₹20 L turnover)
- [ ] EU traffic: cookie consent banner (currently absent — add via
      Cloudflare or a managed service)
- [ ] Trademark "GETX" filed (Class 35 + 41)

## 10. Launch sequence

### T-7 days — internal soft test

```bash
git push origin main
# Wait for green deploys on all 4 apps
curl https://api.getx.gg/api/v1/health
curl -I https://getx.gg
curl -I https://sell.getx.gg
curl -I https://admin.getx.gg
```

- [ ] Internal team uses platform for 24 h
- [ ] Process at least 1 full order (mock provider)
- [ ] Fix any prod-only bugs

### T-3 days — closed beta

- [ ] Invite 10 trusted sellers; each lists ≥5 items (50+ listings)
- [ ] Invite 50 buyers
- [ ] Process first 10 real orders (mock payment OK)
- [ ] Collect feedback in Discord; fix criticals

### T-0 — public launch

- [ ] Activate real payments (set `PADDLE_API_KEY`)
- [ ] Discord announcement
- [ ] Reddit posts (r/PokemonGo + relevant subs)
- [ ] Twitter announcement
- [ ] On-call for 24 h — watch admin dashboard + Sentry

### T+7 — first review

- Total orders, GMV, take rate (target ~17%)
- Disputes / refunds
- Top issues
- Decide Phase 2 priorities

## 11. Emergency procedures

**Site down**

1. `curl https://api.getx.gg/api/v1/health/deep` → check which
   subsystem is failing
2. Railway/Render dashboard → recent logs
3. Sentry → unhandled exceptions
4. Neon dashboard → DB health
5. Roll back via Railway/Vercel "Redeploy previous" if a recent push
   caused it

**Payment issues**

1. Paddle webhook log — were the events delivered?
2. `Order` table — what's `status` / `escrowStatus` / `paymentTransactionId`?
3. `AuditLog` table — `order.paid` events present?
4. Worst case: clear `PADDLE_API_KEY` to flip back to mock and stop new
   real charges; reconcile manually

**Database issues**

1. Neon dashboard — connection pool utilisation
2. If pool exhausted: temporarily raise `connection_limit`, redeploy
3. Data corruption: Neon point-in-time restore (paid plan)

**Spam / abuse**

1. admin.getx.gg → Users → search → Ban (with reason)
2. Ban automatically: revokes all sessions + refresh tokens, pauses
   their listings (atomic, audit-logged as CRITICAL)
3. Any orders affected: refund manually from `/admin/orders/<id>`
