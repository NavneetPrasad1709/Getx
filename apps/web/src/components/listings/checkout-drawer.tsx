'use client';

import * as React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  Button,
  toast,
} from '@getx/ui';
import {
  ShieldCheck,
  Zap,
  CheckCircle2,
  Lock,
  CreditCard,
  Sparkles,
} from 'lucide-react';
import type { ListingDetail, ListingVariant } from '@/hooks/use-listings';
import { useCreateOrderFromListing, useCreateCheckout } from '@/hooks/use-orders';
import { useAuth } from '@/hooks/use-auth';
import { formatMoney } from '@/lib/currency';
import { CHECKOUT_DISABLED } from '@/lib/feature-flags';

/* CheckoutDrawer — the "click → pay" surface.
 *
 * Mounted on a PDP. When the buyer hits Buy, this drawer slides up with
 * a summary + Pay CTA. Pay creates the order and the Stripe checkout
 * session in one chain, then redirects to Stripe. On return, Stripe
 * sends the buyer to /orders/[id]?payment=success — which is where the
 * existing receipt + chat + confirm flow lives.
 *
 * Why a drawer instead of a route: removes the dead /orders/[id]
 * PENDING page the buyer had to land on just to click "Pay" again. */

const BUYER_FEE_PCT = 0.08; // mirrors apps/api orders.service.ts

interface Props {
  listing: ListingDetail;
  open: boolean;
  onClose: () => void;
  variantId?: string;
  activeVariant?: ListingVariant | null;
}

export function CheckoutDrawer({
  listing,
  open,
  onClose,
  variantId,
  activeVariant,
}: Props) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const createOrder = useCreateOrderFromListing();
  const createCheckout = useCreateCheckout();
  const [stage, setStage] = React.useState<'idle' | 'creating' | 'redirecting'>(
    'idle',
  );

  const busy = stage !== 'idle';

  /* Reset stage when the drawer opens — covers the case where the user
     opened, closed mid-flow, then reopens. */
  React.useEffect(() => {
    if (open) setStage('idle');
  }, [open]);

  const price = activeVariant?.price ?? listing.price;
  const originalPrice =
    activeVariant?.originalPrice ?? listing.originalPrice ?? null;
  const currency = listing.currency || 'USD';
  const buyerFee = Math.round(price * BUYER_FEE_PCT * 100) / 100;
  const total = Math.round((price + buyerFee) * 100) / 100;
  const isAuto =
    listing.deliveryType === 'INSTANT' || listing.deliveryType === 'AUTO';
  const eta = activeVariant?.deliveryEta ?? listing.deliveryTime;
  const cover = listing.images?.[0];
  const variantLabel = activeVariant?.label;

  const handlePay = async () => {
    /* Defense-in-depth: every caller that opens this drawer should be
       behind gateCheckout() already, but if a future surface forgets,
       this stops any real order/checkout request from firing while
       Stripe is deferred (MockProvider would otherwise mark the order
       PAID without a charge). */
    if (CHECKOUT_DISABLED) {
      onClose();
      toast.info('Checkout opens in a few days — sign up to get notified at launch.');
      return;
    }
    if (!isAuthenticated) {
      onClose();
      toast.info('Please log in to buy');
      const next = encodeURIComponent(
        window.location.pathname + window.location.search,
      );
      router.push(`/auth/login?next=${next}`);
      return;
    }

    let orderId: string | null = null;
    try {
      setStage('creating');
      const order = await createOrder.mutateAsync({
        listingId: listing.id,
        variantId,
      });
      orderId = order.id;

      setStage('redirecting');
      const session = await createCheckout.mutateAsync(order.id);
      window.location.href = session.checkoutUrl;
    } catch (err) {
      const msg =
        err instanceof AxiosError
          ? (err.response?.data as { message?: string } | undefined)?.message
          : null;
      toast.error(msg ?? 'Could not start checkout');
      setStage('idle');

      /* If the order was created but the checkout-session call failed,
         hand the buyer to the order page so they can retry pay or apply
         wallet/loyalty credit. */
      if (orderId) {
        onClose();
        router.push(`/orders/${orderId}`);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent
        className="inset-x-0 bottom-0 left-0 top-auto w-full max-w-none translate-x-0 translate-y-0 gap-0 p-0 rounded-t-3xl rounded-b-none sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-md sm:rounded-3xl"
      >
          <DialogTitle className="sr-only">
            Confirm purchase
          </DialogTitle>
          <DialogDescription className="sr-only">
            Review the price and click Pay to be redirected to secure checkout.
          </DialogDescription>

          {/* Drawer handle (mobile only) */}
          <div className="sm:hidden flex justify-center pt-2.5 pb-1">
            <span className="h-1 w-9 rounded-full bg-foreground/20" />
          </div>

          {/* Header */}
          <div className="px-5 pt-3 sm:pt-6 pb-4 border-b border-border/40">
            <div className="flex items-center gap-2 mb-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary">
                Secure checkout
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-success/10 text-success font-mono text-[10px] uppercase tracking-wider">
                <Lock className="h-2.5 w-2.5" />
                SSL
              </span>
            </div>
            <div className="flex items-start gap-3">
              <div className="relative h-16 w-16 shrink-0 rounded-xl overflow-hidden bg-surface-elevated border border-border/40">
                {cover ? (
                  <Image
                    src={cover}
                    alt={listing.title}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 grid place-items-center text-2xl text-muted-foreground">
                    ⬡
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-display text-base font-semibold leading-tight line-clamp-2 mb-1">
                  {listing.title}
                </h2>
                {variantLabel ? (
                  <div className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary font-mono text-[10px] uppercase tracking-wider">
                    {variantLabel}
                  </div>
                ) : null}
                <div className="mt-1 text-xs text-muted-foreground">
                  by{' '}
                  <span className="text-foreground/80 font-semibold">
                    @{listing.seller.username ?? listing.seller.name ?? 'seller'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Price breakdown */}
          <div className="px-5 py-4 space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums">
                {formatMoney(price, currency)}
              </span>
            </div>
            {originalPrice && originalPrice > price ? (
              <div className="flex justify-between text-success">
                <span className="font-semibold">
                  You save{' '}
                  {Math.round(((originalPrice - price) / originalPrice) * 100)}%
                </span>
                <span className="tabular-nums">
                  -{formatMoney(originalPrice - price, currency)}
                </span>
              </div>
            ) : null}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Service fee (8%)</span>
              <span className="tabular-nums">
                {formatMoney(buyerFee, currency)}
              </span>
            </div>
            <div className="flex justify-between pt-3 mt-1 border-t border-border/40">
              <span className="font-display text-base font-bold">Total</span>
              <span className="font-display text-xl font-bold tabular-nums">
                {formatMoney(total, currency)}
              </span>
            </div>
          </div>

          {/* Trust + delivery */}
          <div className="px-5 pb-4">
            <ul className="rounded-2xl bg-surface-elevated/40 border border-border/40 px-4 py-3 space-y-2 text-xs">
              <li className="flex items-start gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" />
                <span>
                  <strong className="font-semibold">Escrow protected.</strong>{' '}
                  Funds release only when you confirm.
                </span>
              </li>
              <li className="flex items-start gap-2">
                {isAuto ? (
                  <Zap className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                )}
                <span>
                  {isAuto
                    ? 'Instant delivery — typical under 5 minutes.'
                    : eta
                      ? `Manual delivery · ETA ${eta}.`
                      : 'Seller messages you on confirmation.'}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Sparkles className="h-3.5 w-3.5 text-accent mt-0.5 shrink-0" />
                <span>
                  3-day verification window — full refund if anything&apos;s off.
                </span>
              </li>
            </ul>
          </div>

          {/* CTA */}
          <div className="px-5 pb-5 sm:pb-6">
            <Button
              onClick={handlePay}
              disabled={busy}
              size="xl"
              className="w-full rounded-full shadow-[0_0_40px_-12px_hsl(var(--primary)/0.6)]"
            >
              {stage === 'creating' ? (
                <>Creating order…</>
              ) : stage === 'redirecting' ? (
                <>Redirecting to checkout…</>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" />
                  Pay {formatMoney(total, currency)}
                </>
              )}
            </Button>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="mt-3 w-full text-center font-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <p className="mt-3 text-center text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Apply wallet credit or loyalty points on the next screen
            </p>
          </div>
      </DialogContent>
    </Dialog>
  );
}
