'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button, motion, toast } from '@getx/ui';
import {
  Zap,
  Star,
  Eye,
  ShoppingCart,
  MessageCircle,
  Sparkles,
  Clock,
  ChevronLeft,
  ChevronRight,
  Share2,
  Check,
} from 'lucide-react';
import { AxiosError } from 'axios';
import type { ListingDetail, RelatedListing } from '@/hooks/use-listings';
import { ListingCard, ListingCardSkeleton } from './listing-card';
import { SaveButton } from './save-button';
import { GetxShieldBadge } from '@/components/shield/getx-shield-badge';
import { RefundSlaChip } from '@/components/shield/refund-sla-chip';
import { UrgencyStrip } from './urgency-strip';
import { useOpenPrePurchaseChat } from '@/hooks/use-chat';
import { useAuth } from '@/hooks/use-auth';
import { usePresence, formatLastSeen } from '@/hooks/use-presence';
import { TierAsRankBadge } from '@/components/badges/rank-badge';
import { formatMoney } from '@/lib/currency';

export type SpecRow = { label: string; value: React.ReactNode };

export function Gallery({
  images,
  title,
  fallbackChar = '⬡',
}: {
  images: string[];
  title: string;
  fallbackChar?: string;
}) {
  const has = images.length > 0;
  const [active, setActive] = React.useState(0);
  const [zoom, setZoom] = React.useState({ on: false, x: 50, y: 50 });
  const containerRef = React.useRef<HTMLDivElement>(null);
  const touchStartRef = React.useRef<{ x: number; y: number; t: number } | null>(null);

  const safe = Math.min(active, Math.max(0, images.length - 1));

  function step(d: number) {
    if (!has) return;
    setActive((a) => (a + d + images.length) % images.length);
  }

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const r = containerRef.current?.getBoundingClientRect();
    if (!r) return;
    setZoom({ on: true, x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  }
  function onLeave() {
    setZoom((z) => ({ ...z, on: false }));
  }

  // Swipe gestures — minimum 50px horizontal travel, dominant over vertical,
  // and completed within 600ms. Tuned to feel like Instagram, not Tinder.
  function onTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    const t = e.changedTouches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY, t: performance.now() };
    // Touch never engages the desktop magnifier.
    setZoom((z) => ({ ...z, on: false }));
  }
  function onTouchEnd(e: React.TouchEvent<HTMLDivElement>) {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start || images.length < 2) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    const elapsed = performance.now() - start.t;
    if (Math.abs(dx) < 50) return;
    if (Math.abs(dx) <= Math.abs(dy)) return;
    if (elapsed > 600) return;
    step(dx < 0 ? 1 : -1);
  }

  // Keyboard nav for the gallery — arrow left/right when focused.
  function onKey(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      step(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      step(1);
    }
  }

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onKeyDown={onKey}
        tabIndex={has && images.length > 1 ? 0 : -1}
        role={has && images.length > 1 ? 'region' : undefined}
        aria-label={has && images.length > 1 ? 'Image gallery — swipe or arrow keys to change' : undefined}
        className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-primary/15 via-surface to-accent/10 select-none touch-pan-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {has ? (
          <Image
            key={safe}
            src={images[safe]}
            alt={title}
            fill
            priority
            sizes="(min-width: 1024px) 60vw, 100vw"
            className="object-cover transition-transform duration-500"
            style={zoom.on ? { transform: 'scale(1.8)', transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center">
            <div className="font-display text-[12rem] leading-none font-bold text-primary/20 select-none">
              {fallbackChar}
            </div>
          </div>
        )}

        {has && images.length > 1 && (
          <>
            <button
              onClick={() => step(-1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-background/70 backdrop-blur border border-border/60 grid place-items-center text-foreground hover:bg-background"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => step(1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-background/70 backdrop-blur border border-border/60 grid place-items-center text-foreground hover:bg-background"
              aria-label="Next image"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="absolute bottom-3 left-3 inline-flex items-center px-2 py-1 rounded-md bg-background/70 backdrop-blur font-mono text-[10px] uppercase tracking-wider tabular-nums">
              {safe + 1} / {images.length}
            </div>
          </>
        )}
      </div>

      {has && images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setActive(idx)}
              className={`shrink-0 relative h-20 w-20 rounded-xl overflow-hidden border-2 transition-all ${
                idx === safe ? 'border-primary scale-100' : 'border-border/40 opacity-60 hover:opacity-100 hover:border-border'
              }`}
              aria-label={`Image ${idx + 1}`}
            >
              <Image src={img} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function SpecSheet({ rows, title = 'Specifications' }: { rows: SpecRow[]; title?: string }) {
  if (rows.length === 0) return null;
  return (
    <div className="rounded-3xl border border-border/50 bg-surface/60 backdrop-blur overflow-hidden">
      <div className="px-6 py-4 border-b border-border/40 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {rows.length} attrs
        </span>
      </div>
      <dl className="divide-y divide-border/30">
        {rows.map((r) => (
          <div key={r.label} className="grid grid-cols-3 gap-4 px-6 py-3 text-sm hover:bg-surface-elevated/40 transition-colors">
            <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground self-center">
              {r.label}
            </dt>
            <dd className="col-span-2 font-medium text-foreground">{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function SellerCard({
  listing,
  onMessage,
}: {
  listing: ListingDetail;
  onMessage?: () => void;
}) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const openPrePurchase = useOpenPrePurchaseChat();

  const s = listing.seller;
  const handle = s.username ?? s.name ?? 'seller';
  const initial = handle.slice(0, 1).toUpperCase();
  const memberYear = s.createdAt ? new Date(s.createdAt).getFullYear() : null;

  const { isOnline, lastSeenAt } = usePresence({
    userId: s.id,
    initialLastSeenAt: s.lastSeenAt ?? null,
  });
  const presenceLabel = formatLastSeen(isOnline, lastSeenAt);

  const handleMessage = async () => {
    if (onMessage) {
      onMessage();
      return;
    }
    if (!isAuthenticated) {
      toast.info('Log in to message the seller');
      const next = encodeURIComponent(
        typeof window !== 'undefined' ? window.location.pathname : '/',
      );
      router.push(`/auth/login?next=${next}`);
      return;
    }
    try {
      const conv = await openPrePurchase.mutateAsync({ listingId: listing.id });
      router.push(`/messages?id=${conv.id}`);
    } catch (err) {
      const msg =
        err instanceof AxiosError
          ? (err.response?.data as { message?: string } | undefined)?.message
          : null;
      toast.error(msg ?? 'Could not open chat');
    }
  };

  /* Fast-replier badge — sellers who respond in under 30m convert
     buyers 3× more. Show a green pulse next to response time to
     reinforce the speed signal. */
  const fastReplier = s.responseTimeMin !== null && s.responseTimeMin <= 30;

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-3xl border border-border/50 bg-surface/60 backdrop-blur p-6 hover:border-border/80 hover:shadow-[0_18px_44px_-22px_hsl(var(--foreground)/0.22)] transition-shadow"
    >
      <div className="flex items-start gap-4 mb-5">
        <div className="relative shrink-0">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/60 to-accent/60 grid place-items-center font-display text-xl font-bold text-primary-foreground shadow-[0_8px_22px_-6px_hsl(var(--primary)/0.4)]">
            {initial}
          </div>
          <span
            aria-label={isOnline ? 'Online now' : 'Offline'}
            className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ${
              isOnline
                ? 'bg-[hsl(var(--success))] ring-2 ring-[hsl(var(--background))] shadow-[0_0_8px_hsl(var(--success))]'
                : 'bg-[hsl(var(--muted-foreground)/0.5)] ring-2 ring-[hsl(var(--background))]'
            }`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <Link
            href={`/users/${handle}`}
            className="font-display text-lg font-semibold hover:text-primary transition-colors truncate block"
          >
            @{handle}
          </Link>
          <div className="flex items-center gap-1.5 mt-0.5 text-xs">
            <span
              className={`inline-flex items-center gap-1 font-semibold ${
                isOnline ? 'text-[hsl(var(--success))]' : 'text-muted-foreground'
              }`}
            >
              {isOnline ? (
                <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--success))] animate-pulse" />
              ) : null}
              {presenceLabel}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground flex-wrap">
            <span className="inline-flex items-center gap-1">
              <Star className="h-3 w-3 fill-accent text-accent" />
              <span className="font-semibold text-foreground tabular-nums">
                {s.sellerRating.toFixed(2)}
              </span>
            </span>
            <span>·</span>
            <span>
              <span className="font-semibold text-foreground tabular-nums">{s.totalSales}</span> sales
            </span>
            {s.country && (
              <>
                <span>·</span>
                <span>{s.country}</span>
              </>
            )}
          </div>
        </div>
        <TierAsRankBadge tier={s.verifiedTier} rank={s.rank ?? null} size="md" />
      </div>

      {/* Fast-replier signal — only when sub-30m response time. */}
      {fastReplier && (
        <div className="mb-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 text-success ring-1 ring-success/20 font-mono text-[10px] uppercase tracking-[0.18em] font-bold">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inset-0 rounded-full bg-success opacity-75" />
            <span className="relative rounded-full h-1.5 w-1.5 bg-success" />
          </span>
          Fast replier · usually within {s.responseTimeMin}m
        </div>
      )}

      {s.bio && <p className="text-sm text-muted-foreground mb-5 line-clamp-3">{s.bio}</p>}

      <div className="grid grid-cols-3 gap-3 pt-5 border-t border-border/40">
        <Stat
          label="Completion"
          value={s.completionRate !== null ? `${Math.round(s.completionRate)}%` : '—'}
        />
        <Stat
          label="Response"
          value={s.responseTimeMin !== null ? `${s.responseTimeMin}m` : '—'}
        />
        <Stat label="Joined" value={memberYear ? String(memberYear) : '—'} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <Link href={`/users/${handle}`}>
          <Button variant="outline" size="sm" className="w-full h-9 rounded-full">
            View profile
          </Button>
        </Link>
        <Button
          variant="outline"
          size="sm"
          className="w-full h-9 rounded-full border-[hsl(var(--primary)/0.5)] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.08)]"
          onClick={handleMessage}
          loading={openPrePurchase.isPending}
          loadingText="Opening…"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          Message seller
        </Button>
      </div>
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-display text-base font-semibold tabular-nums">{value}</div>
    </div>
  );
}

export function BuyPanel({
  listing,
  onBuy,
  busy,
}: {
  listing: ListingDetail;
  onBuy: () => void;
  busy?: boolean;
}) {
  const isAuto = listing.deliveryType === 'INSTANT' || listing.deliveryType === 'AUTO';
  const saving =
    listing.originalPrice && listing.originalPrice > listing.price
      ? listing.originalPrice - listing.price
      : 0;
  /* Stock urgency — low stock pushes the buyer to act. <=3 reads as
     "almost gone" without crying wolf at 4. */
  const lowStock = listing.stock > 0 && listing.stock <= 3;
  const inStock = listing.stock > 0;

  return (
    <div className="relative rounded-3xl border border-border/50 bg-surface/80 backdrop-blur-xl overflow-hidden shadow-[0_18px_44px_-22px_hsl(var(--foreground)/0.22)]">
      {/* Soft primary bloom in the corner — keeps the panel feeling
          like a premium product card rather than a flat box. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-16 h-44 w-44 rounded-full bg-primary/15 blur-3xl"
      />

      <div className="relative p-6 space-y-5">
        <UrgencyStrip listing={listing} variant="panel" />

        {/* PRICE BLOCK — big, with strikethrough + savings badge */}
        <div>
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="font-display text-[44px] font-extrabold leading-none tabular-nums">
              {formatMoney(listing.price, listing.currency)}
            </span>
            {listing.originalPrice !== null && (
              <span className="text-sm text-muted-foreground line-through tabular-nums">
                {formatMoney(listing.originalPrice, listing.currency)}
              </span>
            )}
            {listing.discountPercent ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-hot text-hot-foreground font-mono text-[10px] uppercase tracking-wider font-bold shadow-[0_4px_12px_-3px_hsl(var(--hot)/0.5)]">
                −{listing.discountPercent}% off
              </span>
            ) : null}
          </div>
          {saving > 0 && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-success/10 text-success font-mono text-[10px] uppercase tracking-[0.18em] font-bold">
              <Sparkles className="h-3 w-3" strokeWidth={2.5} />
              You save {formatMoney(saving, listing.currency)}
            </div>
          )}
        </div>

        {/* DELIVERY ROW — single bold pill */}
        <div
          className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl ring-1 ${
            isAuto
              ? 'bg-success/8 ring-success/25 text-success'
              : 'bg-primary/8 ring-primary/25 text-primary'
          }`}
        >
          {isAuto ? (
            <Zap className="h-4 w-4 shrink-0 fill-current" strokeWidth={2.5} />
          ) : (
            <Clock className="h-4 w-4 shrink-0" strokeWidth={2.5} />
          )}
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-[13px] leading-tight">
              {isAuto ? 'Instant auto-delivery' : 'Manual delivery'}
            </div>
            <div className="text-[11px] opacity-80 mt-0.5">
              {isAuto
                ? 'Credentials sent in under 5 minutes'
                : listing.deliveryTime
                  ? `ETA · ${listing.deliveryTime}`
                  : 'Seller messages you after payment'}
            </div>
          </div>
        </div>

        <GetxShieldBadge variant="large" />

        {/* Refund SLA chip — single line, removes duplicate shield. */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <RefundSlaChip
            variant="compact"
            category={listing.tabType}
            sellerTier={listing.seller.verifiedTier ?? undefined}
          />
        </div>

        {/* PRIMARY CTA */}
        <Button
          size="xl"
          className="w-full rounded-full shadow-[0_0_40px_-12px_hsl(var(--primary)/0.6)]"
          onClick={onBuy}
          disabled={busy || !inStock}
        >
          {busy ? (
            'Processing…'
          ) : !inStock ? (
            'Out of stock'
          ) : (
            <>
              <ShoppingCart className="h-4 w-4" />
              Buy with escrow
            </>
          )}
        </Button>

        <div className="text-center font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {isAuto && <Zap className="inline h-3 w-3 mr-1 text-primary fill-current" />}
          {isAuto ? 'Delivers in under 5 minutes' : 'Seller will message you on confirmation'}
        </div>

        {/* HOW IT WORKS — 3 mini steps. Cuts friction by making the
            buyer feel they understand the next steps before paying. */}
        <div className="pt-4 mt-2 border-t border-border/40">
          <div className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-muted-foreground font-bold mb-3">
            What happens next
          </div>
          <ol className="space-y-2.5">
            <BuyStep
              n={1}
              title="Pay securely"
              body="Funds locked in GETX escrow — not sent to seller yet."
            />
            <BuyStep
              n={2}
              title={isAuto ? 'Auto-delivery' : 'Seller delivers'}
              body={isAuto ? 'You get the goods in minutes.' : 'Seller messages you within ETA.'}
            />
            <BuyStep
              n={3}
              title="You confirm"
              body="3-day verify window. Full refund if anything is off."
            />
          </ol>
        </div>
      </div>

      {/* FOOTER — stock + views, with low-stock urgency tint */}
      <div
        className={`relative px-6 py-3 border-t border-border/40 flex items-center justify-between text-xs ${
          lowStock ? 'bg-warning/10 text-warning' : 'bg-surface-elevated/40 text-muted-foreground'
        }`}
      >
        <span className="inline-flex items-center gap-1.5">
          <Eye className="h-3 w-3" />
          {listing.viewCount.toLocaleString('en-US')} views
        </span>
        {inStock ? (
          <span className="inline-flex items-center gap-1.5 font-semibold">
            {lowStock ? (
              <>
                <Sparkles className="h-3 w-3 fill-current" />
                Only {listing.stock} left — grab it
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3 text-success" />
                {listing.stock === 1 ? '1 in stock' : `${listing.stock} in stock`}
              </>
            )}
          </span>
        ) : (
          <span className="text-error font-semibold">Out of stock</span>
        )}
      </div>
    </div>
  );
}

/* Small numbered step row used inside BuyPanel's "What happens next". */
function BuyStep({
  n,
  title,
  body,
}: {
  n: number;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-3">
      <div className="grid place-items-center h-6 w-6 rounded-full bg-primary/10 text-primary font-mono text-[11px] font-bold tabular-nums shrink-0">
        {n}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] font-semibold leading-tight">{title}</div>
        <div className="text-[11.5px] text-muted-foreground leading-snug mt-0.5">{body}</div>
      </div>
    </li>
  );
}

export function ListingDetailHeader({
  listing,
  trail,
}: {
  listing: ListingDetail;
  trail: Array<{ href?: string; label: string }>;
}) {
  return (
    <>
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-6 flex-wrap"
      >
        {trail.map((t, i) => (
          <React.Fragment key={i}>
            {t.href ? (
              <Link href={t.href} className="hover:text-foreground transition-colors">
                {t.label}
              </Link>
            ) : (
              <span className="text-foreground line-clamp-1">{t.label}</span>
            )}
            {i < trail.length - 1 && <span aria-hidden>·</span>}
          </React.Fragment>
        ))}
      </nav>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-2 flex items-start justify-between gap-4"
      >
        <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight flex-1 min-w-0">
          {listing.title}
        </h1>
        <div className="mt-2 shrink-0 flex items-center gap-2">
          <ShareListingButton listing={listing} />
          <SaveButton listing={listing} size="lg" variant="inline" />
        </div>
      </motion.div>
      <div className="flex items-center gap-x-4 gap-y-1 flex-wrap text-xs font-mono uppercase tracking-wider text-muted-foreground">
        <span>SKU {listing.sku}</span>
        <span>·</span>
        <span className="inline-flex items-center gap-1">
          <Eye className="h-3 w-3" />
          {listing.viewCount}
        </span>
        <span>·</span>
        <span>{listing.soldCount} sold</span>
        {listing.isFeatured && (
          <>
            <span>·</span>
            <span className="inline-flex items-center gap-1 text-accent">
              <Sparkles className="h-3 w-3" />
              Featured
            </span>
          </>
        )}
        {listing.deliveryTime && (
          <>
            <span>·</span>
            <span className="inline-flex items-center gap-1 text-primary">
              <Clock className="h-3 w-3" />
              {listing.deliveryTime}
            </span>
          </>
        )}
      </div>
    </>
  );
}

export function ListingDetailSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
      <div className="space-y-6">
        <div className="aspect-[4/3] rounded-3xl bg-surface-elevated/40 animate-pulse" />
        <div className="h-10 rounded bg-surface-elevated/40 animate-pulse w-2/3" />
        <div className="h-48 rounded-3xl bg-surface-elevated/40 animate-pulse" />
        <div className="h-32 rounded-3xl bg-surface-elevated/40 animate-pulse" />
      </div>
      <div className="space-y-6">
        <div className="h-72 rounded-3xl bg-surface-elevated/40 animate-pulse" />
        <div className="h-56 rounded-3xl bg-surface-elevated/40 animate-pulse" />
      </div>
    </div>
  );
}

export function RelatedSection({
  related,
  title,
  hrefBase,
}: {
  related: RelatedListing[] | undefined;
  title: string;
  hrefBase: string;
}) {
  if (!related || related.length === 0) return null;
  return (
    <section className="mt-16 md:mt-24">
      <div className="flex items-end justify-between mb-8 gap-4">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary mb-2">
            You might also like
          </div>
          <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight">{title}</h2>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
        {related.slice(0, 3).map((item) => (
          <ListingCard
            key={item.id}
            listing={{
              ...item,
              sku: '',
              originalPrice: null,
              discountPercent: null,
              deliveryType: 'INSTANT',
              deliveryTime: null,
              stock: 1,
              soldCount: 0,
              viewCount: 0,
              favoriteCount: 0,
              isFeatured: false,
              createdAt: '',
              seller: {
                id: item.seller.id,
                username: item.seller.username,
                name: item.seller.name,
                avatar: null,
                sellerRating: item.seller.sellerRating,
                totalSales: 0,
                verifiedTier: item.seller.verifiedTier,
                isVerified: false,
                country: '',
              },
              game: { slug: 'pokemon-go', name: 'Pokémon GO', icon: '' },
            }}
            hrefBase={hrefBase}
          />
        ))}
      </div>
    </section>
  );
}

export function RelatedSkeleton() {
  return (
    <section className="mt-16 md:mt-24">
      <div className="h-8 w-48 rounded bg-surface-elevated/40 animate-pulse mb-8" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <ListingCardSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}

/* Share listing button — opens native share sheet on mobile, copies URL
   to clipboard on desktop. Title + description carry the listing's price
   + seller handle so the share preview reads richly. */
function ShareListingButton({ listing }: { listing: ListingDetail }) {
  const [copied, setCopied] = React.useState(false);

  const share = async () => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
    const url = window.location.href;
    const title = `${listing.title} · GETX`;
    const text = `Check this drop on GETX.`;
    if ('share' in navigator) {
      try {
        await (
          navigator as Navigator & { share: (data: ShareData) => Promise<void> }
        ).share({ title, text, url });
        return;
      } catch {
        /* user cancelled */
      }
    }
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
        toast.success('Listing link copied');
      } catch {
        toast.error('Clipboard blocked — copy manually');
      }
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      aria-label="Share listing"
      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/60 bg-surface/60 hover:bg-surface text-foreground/85 hover:text-foreground transition-colors"
    >
      {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
    </button>
  );
}
