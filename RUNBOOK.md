# GETX Production Runbook

Daily operations for the GETX team. First-time deploy lives in
[`LAUNCH.md`](./LAUNCH.md).

## Daily checks (5 min)

1. `https://admin.getx.gg` → Dashboard
   - Total users / orders today
   - GMV + GETX revenue (8% buyer fee + 10% seller commission)
   - Pending payouts (sum of `User.sellerWallet`)
2. **Audit Logs** tab — scan for `WARNING` / `ERROR` / `CRITICAL`
   severity entries from the last 24 h
3. Sentry / Railway / Render — any unhandled exceptions?
4. Resend dashboard (if email is on) — bounce rate

## Common admin operations

All actions are audit-logged with the admin's user ID. The audit log
entry includes the reason text — make it useful for the next admin who
opens the case.

### Ban a user

`/admin/users/<id>` → **Ban User** → reason (≥5 chars)

Server does, atomically:

- `User.status` → `BANNED`
- All sessions deleted
- All refresh tokens revoked
- `ProductListing.status` → `PAUSED` for any `ACTIVE` listings
- AuditLog entry: `admin.user_banned`, `severity: CRITICAL`

Cannot ban yourself. Cannot ban another `ADMIN` / `SUPER_ADMIN`.

### Force-release escrow (dispute won by seller)

`/admin/orders/<id>` → **Force release escrow to seller** → reason

Only works when `escrowStatus = HELD`. Server:

- `Order.status` → `COMPLETED`, `escrowStatus` → `RELEASED`
- `User.sellerWallet` += `Order.sellerAmount`
- `User.totalEarned` += `Order.sellerAmount`
- `User.totalSales` += 1
- `WalletTransaction` row of `type: ORDER_RELEASED`
- Notifications to **both** parties (seller email + in-app, buyer in-app only)
- AuditLog `admin.escrow_force_released`, `severity: CRITICAL`

### Refund an order

`/admin/orders/<id>` → **Refund order to buyer** → reason

Only valid when `Order.status` is `PAID` / `IN_PROGRESS` / `DELIVERED`.
Server delegates to the active payment provider (mock or Paddle), then:

- `Order.status` → `REFUNDED`, `escrowStatus` → `REFUNDED`
- `Order.refundedAt` / `refundReason` / `refundAmount` / `refundTransactionId` set
- Notifications to both parties (`ORDER_CANCELLED` type, with email)
- AuditLog `admin.order_refunded`, `severity: CRITICAL`

### Hide a listing

`/admin/listings` → row → **Hide** → reason

Sets `status: REMOVED`. Public + seller queries already filter REMOVED
out, so the listing disappears immediately. Reversible: **Unhide** sets
`status: ACTIVE` and clears `deletedAt`.

### Hide a review

`/admin/reviews` → row → **Hide** → reason

Sets `Review.isHidden: true`, appends `"admin: <reason>"` to
`flagReasons[]`, and recomputes the target's `sellerRating` /
`buyerRating` / `totalReviews` atomically.

## Live verification when something looks off

```bash
# API health
curl https://api.getx.gg/api/v1/health
curl https://api.getx.gg/api/v1/health/deep

# Auth round-trip
curl -i -X POST https://api.getx.gg/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@getx.gg","password":"<rotated>"}' \
  -c /tmp/admin.txt
curl https://api.getx.gg/api/v1/auth/me -b /tmp/admin.txt
```

## Database

### Read-only investigation

Use Neon's SQL editor (read replica if you have one). Common queries:

```sql
-- Money flow sanity check (should be approximately 8% + 10% = ~18% of GMV)
SELECT
  COUNT(*) AS orders,
  ROUND(SUM("buyerTotal")::numeric, 2) AS gmv,
  ROUND(SUM("buyerFee" + "sellerCommission")::numeric, 2) AS take
FROM "Order"
WHERE status = 'COMPLETED'
  AND "createdAt" > NOW() - INTERVAL '7 days';

-- Top sellers this week
SELECT s.email, COUNT(*) AS orders, ROUND(SUM(o."sellerAmount")::numeric, 2) AS earned
FROM "Order" o
JOIN "User" s ON s.id = o."sellerId"
WHERE o.status = 'COMPLETED' AND o."createdAt" > NOW() - INTERVAL '7 days'
GROUP BY s.email
ORDER BY earned DESC
LIMIT 10;

-- Stuck orders (DELIVERED but no confirmation, past auto-release)
SELECT "orderNumber", "deliveredAt", "autoReleaseAt", "buyerId", "sellerId"
FROM "Order"
WHERE status = 'DELIVERED' AND "autoReleaseAt" < NOW();
```

### Migrations

1. Test in dev: `pnpm --filter @getx/database db:migrate`
2. Push to git
3. CI: `pnpm --filter @getx/database deploy:prod` against prod env
4. Verify schema in Neon dashboard

> **Never** edit a migration file after it's been applied. Always create
> a new migration to fix mistakes.

### Backups

Neon auto-snapshots daily. Verify in dashboard:

- Daily snapshots present
- Point-in-time recovery enabled (paid plan required)
- Last successful snapshot < 24 h old

## Logs

| What                                      | Where                         |
| ----------------------------------------- | ----------------------------- |
| API request logs                          | Railway / Render dashboard    |
| Frontend logs                             | Vercel dashboard → app → Logs |
| Audit log (admin actions + system events) | admin.getx.gg → Audit Logs    |
| Database query log                        | Neon dashboard (paid plan)    |
| Email delivery                            | Resend dashboard              |

## Escalation contacts

- **Database (Neon)** — support@neon.tech / status.neon.tech
- **Hosting (Railway)** — help@railway.app / status.railway.app
- **Hosting (Render)** — community.render.com / status.render.com
- **Frontend (Vercel)** — vercel.com/support
- **Payments (Paddle)** — support@paddle.com
- **Email (Resend)** — support@resend.com

## Recurring tasks

| Cadence   | Task                                                                                               |
| --------- | -------------------------------------------------------------------------------------------------- |
| Hourly    | (cron) `OrdersService.releaseExpiredEscrow()` — currently a method, wire to a scheduler in Phase 2 |
| Daily     | Dashboard scan, Sentry triage                                                                      |
| Weekly    | Review revenue + take rate against target ~17 %                                                    |
| Monthly   | Rotate `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` (forces logout — communicate first)              |
| Quarterly | Re-run the chat-security audit + the pre-launch audit checklists from the audit reports            |

## Phase 2 roadmap

After 100+ orders processed:

- Custom email templates (currently mock + simple branded HTML)
- Marketing pages (FAQ, Help)
- Mobile apps (Capacitor wrap of web app is the cheapest path)
- SMS notifications via Twilio / MSG91
- Featured listings (paid placement)
- Referral program
- Roblox launch — flip `Game.isActive = true` once the `fieldsConfig`
  is filled in
- Real-time admin alerts (Sentry / OpsGenie integration)
- Background job queue (BullMQ / pg-boss) for the escrow auto-release
  cron + email batches
