'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button, Badge, motion, useReducedMotion } from '@getx/ui';
import { Heart, X, Sparkles, Trash2, ArrowRight } from 'lucide-react';
import { Header } from '@/components/header';
import { LandingFooter } from '@/components/landing/landing-footer';
import { useWishlist, type WishlistEntry } from '@/hooks/use-wishlist';
import { formatMoney } from '@/lib/currency';

/* /profile/wishlist — buyer's saved listings.

   Local-only today; once a server endpoint exists the entries shape can be
   swapped to a server query without touching the page. Empty state is a
   conversion ramp, not a dead end. */

function hrefFor(entry: WishlistEntry): string {
  const tab =
    entry.tabType === 'TOP_UPS'
      ? 'top-ups'
      : entry.tabType === 'ITEMS'
        ? 'items'
        : 'accounts';
  if (!entry.slug) return `/games/${entry.gameSlug}/${tab}`;
  return `/games/${entry.gameSlug}/${tab}/${entry.slug}`;
}

export default function WishlistPage() {
  const reduce = useReducedMotion();
  const { entries, remove, clear, count } = useWishlist();

  // Avoid SSR/CSR mismatch — wishlist lives in localStorage so first render
  // server-side has none. Mount flag delays the populated render to the
  // client, preventing the brief "empty then populated" flash.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="container py-12 md:py-20 flex-1 max-w-6xl">
        {/* Header */}
        <div className="mb-10 flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary mb-2 inline-flex items-center gap-2">
              <Heart className="h-3 w-3" />
              Profile · Wishlist
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
              Saved drops
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {mounted && count > 0
                ? `${count} listing${count === 1 ? '' : 's'} saved · we’ll ping you if any drop in price.`
                : 'Heart any drop to keep an eye on it. Price-drop alerts coming soon.'}
            </p>
          </div>

          {mounted && count > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm('Clear your entire wishlist?')) clear();
              }}
              className="rounded-full"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear all
            </Button>
          ) : null}
        </div>

        {!mounted || count === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {entries.map((entry, i) => (
              <motion.div
                key={entry.id}
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: Math.min(i, 8) * 0.04, ease: [0.22, 1, 0.36, 1] }}
              >
                <WishlistCard entry={entry} onRemove={() => remove(entry.id)} />
              </motion.div>
            ))}
          </div>
        )}
      </main>
      <LandingFooter />
    </div>
  );
}

function WishlistCard({ entry, onRemove }: { entry: WishlistEntry; onRemove: () => void }) {
  const href = hrefFor(entry);
  return (
    <article className="group relative rounded-2xl border border-border/60 bg-surface/60 backdrop-blur-xl overflow-hidden transition-all duration-ui ease-apple hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_20px_50px_-20px_hsl(var(--primary-glow)/0.4)]">
      <Link href={href} className="block">
        <div className="relative aspect-[5/3] overflow-hidden bg-gradient-to-br from-primary/15 via-surface to-accent/10">
          {entry.cover ? (
            <Image
              src={entry.cover}
              alt={entry.title}
              fill
              sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-section ease-apple group-hover:scale-[1.04]"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-7xl text-primary/20 font-display font-bold">⬡</div>
          )}
          <div className="absolute top-3 left-3">
            <Badge variant="new" size="sm">
              <Heart className="h-3 w-3 fill-current" />
              Saved
            </Badge>
          </div>
        </div>

        <div className="p-4">
          <h3 className="font-display text-base font-semibold leading-snug line-clamp-2 min-h-[2.6rem] group-hover:text-primary transition-colors">
            {entry.title}
          </h3>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="font-mono text-xl font-bold tabular-nums">
              {formatMoney(entry.price, entry.currency)}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-primary opacity-0 translate-x-[-4px] transition-all duration-ui group-hover:opacity-100 group-hover:translate-x-0">
              View <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      </Link>

      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove();
        }}
        aria-label="Remove from wishlist"
        className="absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-background/80 backdrop-blur-xl border border-border/40 text-muted-foreground hover:text-hot hover:border-hot/40 transition-colors duration-ui"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </article>
  );
}

function EmptyState() {
  return (
    <div className="surface-cinematic rounded-3xl py-16 px-6 text-center max-w-2xl mx-auto">
      <div className="relative h-16 w-16 mx-auto mb-6">
        <div className="absolute inset-0 rounded-2xl bg-hot/10 animate-pulse-glow" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-hot/15 text-hot">
          <Heart className="h-7 w-7" />
        </div>
      </div>
      <h2 className="font-display text-2xl font-bold mb-3">Nothing saved yet</h2>
      <p className="text-sm text-muted-foreground max-w-md mx-auto mb-8 leading-relaxed">
        Tap the heart on any listing to keep an eye on it. We&apos;ll ping you when prices drop
        and when a similar drop lands.
      </p>
      <Link href="/games/pokemon-go/accounts">
        <Button size="lg" className="rounded-full">
          <Sparkles className="h-4 w-4" />
          Browse drops
        </Button>
      </Link>
    </div>
  );
}
