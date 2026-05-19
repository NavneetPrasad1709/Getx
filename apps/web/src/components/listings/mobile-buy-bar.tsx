'use client';

import * as React from 'react';
import { motion, AnimatePresence, useReducedMotion } from '@getx/ui';
import { Button } from '@getx/ui';
import { ShoppingCart, ShieldCheck, Zap, ChevronUp, X } from 'lucide-react';
import type { ListingDetail } from '@/hooks/use-listings';
import { UrgencyStrip } from './urgency-strip';
import { formatMoney } from '@/lib/currency';

/* MobileBuyBar — a thin fixed bar that pins to the bottom of the viewport on
   mobile detail pages. The full BuyPanel is far below the fold on phones, so
   without this bar the user has to scroll just to find "Buy". Expand button
   reveals trust signals + delivery info without leaving the page. */

interface Props {
  listing: ListingDetail;
  onBuy: () => void;
  busy?: boolean;
}

export function MobileBuyBar({ listing, onBuy, busy }: Props) {
  const reduce = useReducedMotion();
  const [expanded, setExpanded] = React.useState(false);
  const [visible, setVisible] = React.useState(false);

  // Hide on first render until the user has scrolled past the hero gallery.
  React.useEffect(() => {
    let last = 0;
    const onScroll = () => {
      const y = window.scrollY;
      // Show only after ~60vh — past the gallery on phones.
      const threshold = window.innerHeight * 0.6;
      const next = y > threshold;
      if (next !== last > threshold) setVisible(next);
      last = y;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isAuto = listing.deliveryType === 'INSTANT' || listing.deliveryType === 'AUTO';
  const saving =
    listing.originalPrice && listing.originalPrice > listing.price
      ? listing.originalPrice - listing.price
      : 0;

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={reduce ? false : { y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduce ? undefined : { y: 80, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="lg:hidden fixed inset-x-3 bottom-3 z-40"
        >
          {/* Expanded trust panel */}
          <AnimatePresence>
            {expanded ? (
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: 12 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="mb-2 rounded-2xl border border-border/60 bg-background/95 backdrop-blur-xl p-4 shadow-[0_-20px_60px_-20px_hsl(var(--primary-glow)/0.3)]"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Buy details
                  </span>
                  <button
                    type="button"
                    onClick={() => setExpanded(false)}
                    aria-label="Close"
                    className="h-7 w-7 grid place-items-center rounded-full bg-surface/60 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <ul className="space-y-2 text-xs text-foreground/85">
                  <li className="flex items-start gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" />
                    <span>
                      <strong className="font-semibold">Escrow protected</strong> — released only on your confirm
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    {isAuto ? (
                      <Zap className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                    ) : (
                      <ShieldCheck className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                    )}
                    <span>
                      {isAuto
                        ? 'Instant delivery — under 5 minutes typical'
                        : listing.deliveryTime
                          ? `Manual delivery · ETA ${listing.deliveryTime}`
                          : 'Manual delivery'}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" />
                    <span>3-day verification window. Full refund if anything&apos;s off.</span>
                  </li>
                </ul>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Buy bar */}
          <div className="rounded-2xl border border-border/60 bg-background/95 backdrop-blur-xl shadow-[0_-20px_60px_-20px_hsl(var(--primary-glow)/0.45)] p-2 pl-4">
            <div className="px-1 pt-1 pb-1.5 flex justify-center [&:empty]:hidden">
              <UrgencyStrip listing={listing} variant="mobile" />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                aria-label="Toggle buy details"
                className="flex-1 min-w-0 text-left"
              >
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-xl font-bold tabular-nums">
                    {formatMoney(listing.price, listing.currency)}
                  </span>
                  {listing.originalPrice && listing.originalPrice > listing.price ? (
                    <span className="text-xs text-muted-foreground line-through tabular-nums">
                      {formatMoney(listing.originalPrice, listing.currency)}
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {saving > 0 ? (
                    <span className="text-success">Save {formatMoney(saving, listing.currency)}</span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <ShieldCheck className="h-2.5 w-2.5 text-success" />
                      Escrow protected
                    </span>
                  )}
                  <ChevronUp
                    className={`h-3 w-3 transition-transform duration-ui ease-apple ${expanded ? 'rotate-180' : ''}`}
                  />
                </div>
              </button>

              <Button
                onClick={onBuy}
                disabled={busy}
                loading={busy}
                loadingText="Processing…"
                size="lg"
                className="rounded-full px-5 shrink-0"
              >
                <ShoppingCart className="h-4 w-4" />
                Buy
              </Button>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
