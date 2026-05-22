'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { AxiosError } from 'axios';
import { Badge, Button, Card, Skeleton, toast } from '@getx/ui';
import {
  ShieldCheck,
  Clock,
  Truck,
  CheckCircle2,
  CircleDashed,
  Sparkles,
  AlertTriangle,
  RefreshCcw,
  ShieldAlert,
  XCircle,
  Wallet,
  Vault,
  Eye,
  MessageCircle,
  ArrowRight,
  Star,
} from 'lucide-react';
import { Header } from '@/components/header';
import { LandingFooter } from '@/components/landing/landing-footer';
import { CHECKOUT_DISABLED } from '@/lib/feature-flags';
import { GetxShieldBadge } from '@/components/shield/getx-shield-badge';
import { TierAsRankBadge } from '@/components/badges/rank-badge';
import { useApplyWallet, useWallet } from '@/hooks/use-wallet';
import {
  useApplyLoyalty,
  useLoyalty,
  useLoyaltyPreview,
  useRemoveLoyalty,
} from '@/hooks/use-loyalty';
import { formatMoney } from '@/lib/currency';
import { DisputeModal } from '@/components/orders/dispute-modal';
import { PaymentRewardModal } from '@/components/orders/payment-reward-modal';
import {
  useConfirmReceipt,
  useCreateCheckout,
  useOrder,
  useReorder,
  type OrderDetail,
  type OrderStatus,
} from '@/hooks/use-orders';
import { useAuth } from '@/hooks/use-auth';
import { ChatButton } from '@/components/chat/chat-button';
import { ReviewForm } from '@/components/reviews/review-form';
import { useReviewEligibility } from '@/hooks/use-reviews';

const STATUS_INFO: Record<
  OrderStatus,
  {
    surface: string;
    accent: string;
    label: string;
    message: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  PENDING: {
    surface: 'border-warning/30 bg-warning/5',
    accent: 'text-warning',
    label: 'Awaiting payment',
    message: 'Complete checkout to lock the order with the seller.',
    icon: Clock,
  },
  PAID: {
    surface: 'border-primary/30 bg-primary/5',
    accent: 'text-primary',
    label: 'Payment received',
    message: 'Funds held in escrow. Seller is preparing your order.',
    icon: ShieldCheck,
  },
  IN_PROGRESS: {
    surface: 'border-primary/30 bg-primary/5',
    accent: 'text-primary',
    label: 'Order in progress',
    message: 'Seller is on it. Updates will appear here.',
    icon: Sparkles,
  },
  DELIVERED: {
    surface: 'border-success/30 bg-success/5',
    accent: 'text-success',
    label: 'Delivered',
    message: 'Verify and confirm to release funds to the seller.',
    icon: Truck,
  },
  CONFIRMED: {
    surface: 'border-success/30 bg-success/5',
    accent: 'text-success',
    label: 'Receipt confirmed',
    message: 'Thanks. Release in progress.',
    icon: CheckCircle2,
  },
  COMPLETED: {
    surface: 'border-success/30 bg-success/5',
    accent: 'text-success',
    label: 'Completed',
    message: 'Order completed. Funds released to seller.',
    icon: CheckCircle2,
  },
  CANCELLED: {
    surface: 'border-muted/30 bg-muted/5',
    accent: 'text-muted-foreground',
    label: 'Cancelled',
    message: 'This order was cancelled. No funds were captured.',
    icon: XCircle,
  },
  DISPUTED: {
    surface: 'border-error/30 bg-error/5',
    accent: 'text-error',
    label: 'Disputed',
    message: 'A dispute is open. Our team will reach out shortly.',
    icon: AlertTriangle,
  },
  REFUNDED: {
    surface: 'border-muted/30 bg-muted/5',
    accent: 'text-muted-foreground',
    label: 'Refunded',
    message: 'Funds returned to your original payment method.',
    icon: RefreshCcw,
  },
};

function extractMessage(err: unknown): string | null {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { message?: string } | undefined;
    return data?.message ?? null;
  }
  return null;
}

function snapshotTitle(order: OrderDetail): string {
  const fromListing = order.productListing?.title;
  const fromRequest = order.customRequest?.title;
  const fromMeta = order.paymentMetadata?.snapshotTitle;
  return fromListing ?? fromRequest ?? fromMeta ?? `Order ${order.orderNumber}`;
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params.id;
  const { user } = useAuth();

  const { data: order, isLoading, refetch } = useOrder(id);
  const createCheckout = useCreateCheckout();
  const confirmReceipt = useConfirmReceipt();
  const reorder = useReorder();
  const { data: wallet } = useWallet(true);
  const applyWallet = useApplyWallet();
  const { data: loyalty } = useLoyalty(true);
  const { data: loyaltyPreview, refetch: refetchLoyaltyPreview } =
    useLoyaltyPreview(id, true);
  const applyLoyalty = useApplyLoyalty();
  const removeLoyalty = useRemoveLoyalty();
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [rewardOpen, setRewardOpen] = useState(false);
  const { data: eligibility, refetch: refetchEligibility } = useReviewEligibility(
    id,
    order?.status === 'COMPLETED',
  );

  useEffect(() => {
    const status = searchParams.get('payment');
    if (status === 'success') {
      toast.success('Payment received! Your order is being processed.');
      void refetch();

      /* Open the reward unlock once per order, gated on sessionStorage so
         a refresh of the success URL doesn't re-fire confetti. */
      let alreadyClaimed = false;
      try {
        alreadyClaimed = sessionStorage.getItem(`getx:reward-claimed:${id}`) === '1';
      } catch {
        /* sessionStorage blocked */
      }
      if (!alreadyClaimed) {
        setRewardOpen(true);
      }
    } else if (status === 'cancelled') {
      toast.error('Payment cancelled');
    }
  }, [searchParams, refetch, id]);

  const handlePay = async () => {
    /* Defense against bypassing the listing-page CHECKOUT_DISABLED
       gate. Reaching this branch requires an order already in PENDING,
       which existed before Stripe was deferred — so users hitting Pay
       from order-detail get the same "coming soon" treatment. Real
       checkout re-enables when STRIPE_SECRET_KEY lands on the API
       (see PaymentsService.resolveProvider). */
    if (CHECKOUT_DISABLED) {
      toast.info('Checkout opens in a few days — sign up to get notified at launch.');
      return;
    }
    try {
      const session = await createCheckout.mutateAsync(id);
      window.location.href = session.checkoutUrl;
    } catch (err) {
      toast.error(extractMessage(err) ?? 'Failed to create checkout');
    }
  };

  const handleConfirmReceipt = async () => {
    if (!confirm('Confirm you received what was promised? This releases payment to seller.'))
      return;
    try {
      await confirmReceipt.mutateAsync(id);
      toast.success('Receipt confirmed. Thank you!');
    } catch (err) {
      toast.error(extractMessage(err) ?? 'Failed to confirm');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main id="main" className="container py-24 flex-1">
          <Skeleton className="h-96 rounded-3xl" />
        </main>
        <LandingFooter />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main id="main" className="container py-24 flex-1 flex items-center justify-center">
          <Card variant="cinematic" className="max-w-md p-12 text-center">
            <h1 className="font-display text-2xl font-bold mb-2">Order not found</h1>
            <p className="text-muted-foreground text-sm mb-6">
              The link may be stale, or this order belongs to a different account.
            </p>
            <Link href="/profile/orders">
              <Button size="lg" className="rounded-full">My orders</Button>
            </Link>
          </Card>
        </main>
        <LandingFooter />
      </div>
    );
  }

  const isBuyer = user?.id === order.buyer.id;
  const counterparty = isBuyer ? order.seller : order.buyer;
  const info = STATUS_INFO[order.status];
  const title = snapshotTitle(order);
  const StatusIcon = info.icon;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main id="main" className="container py-10 lg:py-16 flex-1 max-w-6xl">
        {/* Status hero */}
        <div className={`surface-cinematic rounded-3xl p-6 md:p-8 mb-8 ${info.surface}`}>
          <div className="flex items-start gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-background/70 backdrop-blur ${info.accent}`}
            >
              <StatusIcon className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  {order.orderNumber}
                </span>
                <Badge variant="outline" size="sm" className={`uppercase ${info.accent} border-current/30`}>
                  {info.label}
                </Badge>
              </div>
              <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight mb-2">
                {title}
              </h1>
              <p className="text-sm text-foreground/75">{info.message}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
          {/* Left rail */}
          <div className="space-y-6 min-w-0">
            {/* Escrow flow visualization */}
            <EscrowMicroFlow status={order.status} />

            {/* Timeline */}
            <section className="surface-cinematic rounded-3xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border/40 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold">Order timeline</h2>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Auto-updated
                </span>
              </div>
              <div className="p-6">
                <Timeline order={order} />
              </div>
            </section>

            {order.status === 'COMPLETED' && eligibility?.canReview ? (
              <ReviewForm
                orderId={order.id}
                onSuccess={() => {
                  void refetchEligibility();
                  void refetch();
                }}
              />
            ) : null}

            {(order.status === 'DELIVERED' || order.status === 'COMPLETED') &&
            order.deliveryProof ? (
              <section className="surface-cinematic rounded-3xl overflow-hidden">
                <div className="px-6 py-4 border-b border-border/40">
                  <h2 className="font-display text-lg font-semibold">Delivery details</h2>
                </div>
                <div className="p-6 space-y-5">
                  {order.deliveryProof.notes ? (
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5">
                        Notes from seller
                      </div>
                      <p className="text-sm whitespace-pre-line text-foreground/85 leading-relaxed">
                        {order.deliveryProof.notes}
                      </p>
                    </div>
                  ) : null}
                  {order.deliveryProof.images.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {order.deliveryProof.images.map((url, i) => (
                        <div
                          key={i}
                          className="relative aspect-square overflow-hidden rounded-xl border border-border/40 bg-surface"
                        >
                          <Image
                            src={url}
                            alt={`Proof ${i + 1}`}
                            fill
                            sizes="(min-width: 640px) 25vw, 50vw"
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {isBuyer && order.deliveryProof.credentials ? (
                    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
                          Account credentials
                        </span>
                      </div>
                      <div className="space-y-1.5 font-mono text-sm">
                        <div>
                          <span className="text-muted-foreground">Username: </span>
                          <span className="text-foreground break-all">
                            {order.deliveryProof.credentials.username}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Password: </span>
                          <span className="text-foreground break-all">
                            {order.deliveryProof.credentials.password}
                          </span>
                        </div>
                        {order.deliveryProof.credentials.extra ? (
                          <div className="pt-2 mt-2 border-t border-border/40 text-xs text-muted-foreground">
                            {order.deliveryProof.credentials.extra}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}
          </div>

          {/* Right rail */}
          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            {/* Pricing */}
            <section className="surface-cinematic rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-base font-semibold">Pricing</h3>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  {order.currency.toUpperCase()}
                </span>
              </div>
              <dl className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd className="tabular-nums">{formatMoney(order.amount, order.currency)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Service fee</dt>
                  <dd className="tabular-nums">{formatMoney(order.buyerFee, order.currency)}</dd>
                </div>
                {order.taxAmount && order.taxAmount > 0 ? (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Tax</dt>
                    <dd className="tabular-nums">
                      {formatMoney(order.taxAmount, order.currency)}
                    </dd>
                  </div>
                ) : null}
                {order.walletApplied && order.walletApplied > 0 ? (
                  <div className="flex justify-between text-[hsl(var(--success))]">
                    <dt className="font-semibold">GETX Coins applied</dt>
                    <dd className="tabular-nums">
                      -{formatMoney(order.walletApplied, order.currency)}
                    </dd>
                  </div>
                ) : null}
                {order.loyaltyUsdApplied && order.loyaltyUsdApplied > 0 ? (
                  <div className="flex justify-between text-[hsl(280_85%_60%)]">
                    <dt className="font-semibold">
                      Loyalty points ({order.loyaltyPointsApplied?.toLocaleString('en-US')} pts)
                    </dt>
                    <dd className="tabular-nums">
                      -{formatMoney(order.loyaltyUsdApplied, order.currency)}
                    </dd>
                  </div>
                ) : null}
                <div className="flex justify-between pt-3 mt-1 border-t border-border/40">
                  <dt className="font-display text-base font-bold">Total</dt>
                  <dd className="font-display text-xl font-bold tabular-nums">
                    {formatMoney(
                      Math.max(
                        0,
                        order.buyerTotal -
                          (order.walletApplied ?? 0) -
                          (order.loyaltyUsdApplied ?? 0),
                      ),
                      order.currency,
                    )}
                  </dd>
                </div>
              </dl>
              {/* Receipt link — only visible once payment is captured.
                  Opens a printable HTML receipt; buyer prints to PDF via
                  the browser. */}
              {(order.status === 'PAID' ||
                order.status === 'IN_PROGRESS' ||
                order.status === 'DELIVERED' ||
                order.status === 'CONFIRMED' ||
                order.status === 'COMPLETED') &&
              isBuyer ? (
                <Link
                  href={`/orders/${order.id}/receipt`}
                  className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[hsl(var(--primary))] hover:underline"
                >
                  Download receipt (PDF)
                  <ArrowRight className="h-3 w-3" />
                </Link>
              ) : null}
              {order.status === 'COMPLETED' && isBuyer ? (
                <div className="mt-5 rounded-2xl bg-[hsl(var(--success)/0.08)] border border-[hsl(var(--success)/0.3)] px-4 py-3 flex items-center gap-3">
                  <span className="h-8 w-8 rounded-full bg-[hsl(var(--success)/0.18)] grid place-items-center shrink-0">
                    <Sparkles className="h-4 w-4 text-[hsl(var(--success))]" />
                  </span>
                  <div className="text-[12.5px]">
                    <div className="font-semibold text-foreground">
                      You earned{' '}
                      {formatMoney(
                        Math.floor(order.buyerTotal * 0.01 * 100) / 100,
                        order.currency,
                      )}{' '}
                      cashback
                    </div>
                    <Link
                      href="/profile/wallet"
                      className="text-[11px] text-[hsl(var(--success))] hover:underline"
                    >
                      View wallet →
                    </Link>
                  </div>
                </div>
              ) : null}
            </section>

            {order.status === 'PENDING' && isBuyer ? (
              <section className="surface-cinematic rounded-3xl p-6">
                {/* GETX Coins apply row — visible when buyer has a balance and
                    hasn't applied any to this order yet. */}
                {wallet && wallet.balance > 0 && !(order.walletApplied && order.walletApplied > 0) ? (
                  <ApplyWalletRow
                    balance={wallet.balance}
                    currency={order.currency}
                    buyerTotal={order.buyerTotal}
                    onApply={async (amt) => {
                      try {
                        await applyWallet.mutateAsync({
                          orderId: order.id,
                          amount: amt,
                        });
                        toast.success(`Applied ${formatMoney(amt, order.currency)} from wallet`);
                        void refetch();
                      } catch (err) {
                        const msg = extractMessage(err);
                        toast.error(msg ?? 'Could not apply wallet credit');
                      }
                    }}
                    busy={applyWallet.isPending}
                  />
                ) : null}
                {order.walletApplied && order.walletApplied > 0 ? (
                  <div className="mb-4 rounded-2xl bg-[hsl(var(--success)/0.08)] border border-[hsl(var(--success)/0.3)] px-4 py-2.5 text-[12.5px] text-[hsl(var(--success))] font-semibold inline-flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    {formatMoney(order.walletApplied, order.currency)} GETX Coins applied
                  </div>
                ) : null}

                {/* Loyalty apply row — visible when buyer has redeemable
                    points, no wallet credit on this order yet, and no
                    points already applied. Mutex with wallet enforced
                    on the server too. */}
                {loyalty &&
                loyalty.balance > 0 &&
                loyaltyPreview &&
                !loyaltyPreview.blockedByWallet &&
                !(order.loyaltyPointsApplied && order.loyaltyPointsApplied > 0) ? (
                  <ApplyLoyaltyRow
                    balance={loyaltyPreview.balance}
                    maxPoints={loyaltyPreview.maxPoints}
                    currency={order.currency}
                    onApply={async (pts) => {
                      try {
                        await applyLoyalty.mutateAsync({
                          orderId: order.id,
                          points: pts,
                        });
                        toast.success(`Redeemed ${pts.toLocaleString('en-US')} points`);
                        void refetch();
                        void refetchLoyaltyPreview();
                      } catch (err) {
                        const msg = extractMessage(err);
                        toast.error(msg ?? 'Could not redeem points');
                      }
                    }}
                    busy={applyLoyalty.isPending}
                  />
                ) : null}
                {order.loyaltyPointsApplied && order.loyaltyPointsApplied > 0 ? (
                  <div className="mb-4 flex items-center justify-between rounded-2xl bg-[hsl(280_85%_60%/0.1)] border border-[hsl(280_85%_60%/0.3)] px-4 py-2.5 text-[12.5px]">
                    <span className="text-[hsl(280_85%_60%)] font-semibold inline-flex items-center gap-1.5">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      {order.loyaltyPointsApplied.toLocaleString('en-US')} pts applied (
                      -{formatMoney(order.loyaltyUsdApplied ?? 0, order.currency)})
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await removeLoyalty.mutateAsync({ orderId: order.id });
                          toast.success('Points removed');
                          void refetch();
                          void refetchLoyaltyPreview();
                        } catch (err) {
                          const msg = extractMessage(err);
                          toast.error(msg ?? 'Could not remove points');
                        }
                      }}
                      disabled={removeLoyalty.isPending}
                      className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    >
                      {removeLoyalty.isPending ? 'Removing…' : 'Remove'}
                    </button>
                  </div>
                ) : null}

                <Button
                  onClick={handlePay}
                  loading={createCheckout.isPending}
                  loadingText="Creating checkout…"
                  size="xl"
                  className="w-full rounded-full shadow-[0_0_40px_-12px_hsl(var(--primary)/0.6)]"
                >
                  <Wallet className="h-4 w-4" />
                  Pay{' '}
                  {formatMoney(
                    Math.max(
                      0,
                      order.buyerTotal -
                        (order.walletApplied ?? 0) -
                        (order.loyaltyUsdApplied ?? 0),
                    ),
                    order.currency,
                  )}
                </Button>
                <div className="mt-3 flex justify-center">
                  <GetxShieldBadge variant="inline" />
                </div>
              </section>
            ) : null}

            {order.status === 'DELIVERED' && isBuyer ? (
              <section className="surface-cinematic rounded-3xl p-6">
                <Button
                  onClick={handleConfirmReceipt}
                  loading={confirmReceipt.isPending}
                  loadingText="Confirming…"
                  variant="success"
                  size="xl"
                  className="w-full rounded-full"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Confirm receipt
                </Button>
                <p className="mt-3 text-center text-[11px] text-muted-foreground">
                  Auto-releases in 3 days if no issues
                </p>
              </section>
            ) : null}

            {/* Re-order + Dispute actions */}
            {isBuyer ? (
              <ActionsCard
                order={order}
                onReorder={async () => {
                  try {
                    const res = await reorder.mutateAsync(order.id);
                    toast.success('New order created — proceed to pay');
                    router.push(`/orders/${res.orderId}`);
                  } catch (err) {
                    const msg = extractMessage(err);
                    if (msg?.includes('no longer available')) {
                      toast.error('Listing sold out — view similar');
                      router.push(
                        `/games/${order.productListing?.slug ? 'pokemon-go/accounts' : 'pokemon-go/accounts'}`,
                      );
                    } else {
                      toast.error(msg ?? 'Could not re-order');
                    }
                  }
                }}
                onOpenDispute={() => setDisputeOpen(true)}
                reorderBusy={reorder.isPending}
              />
            ) : null}

            {/* Counterparty */}
            <section className="surface-cinematic rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-base font-semibold">
                  {isBuyer ? 'Seller' : 'Buyer'}
                </h3>
                <TierAsRankBadge
                  tier={counterparty.verifiedTier}
                  rank={counterparty.rank ?? null}
                  size="sm"
                />
              </div>
              <div className="flex items-center gap-3 mb-5">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/60 to-accent/60 grid place-items-center text-primary-foreground font-display text-lg font-bold">
                  {(counterparty.name ?? counterparty.username ?? '?').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-display text-base font-semibold truncate">
                    {counterparty.username ? `@${counterparty.username}` : counterparty.name ?? '—'}
                  </div>
                  {isBuyer && counterparty.sellerRating !== undefined ? (
                    <div className="text-xs text-muted-foreground tabular-nums">
                      ★ {counterparty.sellerRating.toFixed(1)} · seller rating
                    </div>
                  ) : null}
                </div>
              </div>
              {order.status !== 'CANCELLED' && order.status !== 'PENDING' ? (
                <ChatButton
                  orderId={order.id}
                  label={isBuyer ? 'Message seller' : 'Message buyer'}
                  variant="outline"
                  className="w-full rounded-full"
                />
              ) : (
                <Button variant="ghost" size="sm" disabled className="w-full rounded-full">
                  <MessageCircle className="h-3.5 w-3.5" />
                  Chat opens after payment
                </Button>
              )}
            </section>
          </aside>
        </div>
      </main>

      {disputeOpen ? (
        <DisputeModal
          orderId={order.id}
          orderNumber={order.orderNumber}
          onClose={() => setDisputeOpen(false)}
          onSuccess={() => void refetch()}
        />
      ) : null}

      <PaymentRewardModal
        orderId={order.id}
        open={rewardOpen}
        onClose={() => setRewardOpen(false)}
      />

      <LandingFooter />
    </div>
  );
}

/* Re-order + dispute actions card. Renders different combinations
   depending on order status:
     COMPLETED                → Re-order
     PAID / IN_PROGRESS / DELIVERED + no open dispute → Open dispute
     Any open dispute         → View dispute (link)  */
function ActionsCard({
  order,
  onReorder,
  onOpenDispute,
  reorderBusy,
}: {
  order: OrderDetail;
  onReorder: () => void;
  onOpenDispute: () => void;
  reorderBusy: boolean;
}) {
  const openDispute = order.disputes?.find((d) =>
    ['OPEN', 'REVIEWING', 'AWAITING_RESPONSE'].includes(d.status),
  );
  const canReorder =
    order.status === 'COMPLETED' && !!order.productListing?.id;
  const canDispute =
    !openDispute && ['PAID', 'IN_PROGRESS', 'DELIVERED'].includes(order.status);

  if (!canReorder && !canDispute && !openDispute) return null;

  return (
    <section className="surface-cinematic rounded-3xl p-5 space-y-3">
      {canReorder ? (
        <Button
          onClick={onReorder}
          loading={reorderBusy}
          loadingText="Creating order…"
          variant="outline"
          className="w-full rounded-full"
        >
          <RefreshCcw className="h-4 w-4" />
          Buy this again
        </Button>
      ) : null}

      {openDispute ? (
        <div className="rounded-2xl border border-[hsl(var(--error)/0.35)] bg-[hsl(var(--error)/0.05)] p-4">
          <div className="flex items-start gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-[hsl(var(--error))] mt-0.5 shrink-0" />
            <div className="min-w-0">
              <div className="font-display text-[13px] font-extrabold">
                Dispute {openDispute.disputeNumber}
              </div>
              <div className="text-[11.5px] text-muted-foreground">
                Status · {openDispute.status.replace('_', ' ').toLowerCase()} · funds in escrow
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" disabled className="w-full rounded-full">
            View dispute
          </Button>
        </div>
      ) : canDispute ? (
        <Button
          onClick={onOpenDispute}
          variant="outline"
          className="w-full rounded-full border-[hsl(var(--error)/0.45)] text-[hsl(var(--error))] hover:bg-[hsl(var(--error)/0.08)]"
        >
          <ShieldAlert className="h-4 w-4" />
          Open a dispute
        </Button>
      ) : null}
    </section>
  );
}

/* GETX Coins apply control — shows the buyer's available credit (capped at
   50% of order total) and a slider to choose how much to redeem. */
function ApplyWalletRow({
  balance,
  currency,
  buyerTotal,
  onApply,
  busy,
}: {
  balance: number;
  currency: string;
  buyerTotal: number;
  onApply: (amount: number) => void;
  busy: boolean;
}) {
  const cap = Math.floor(buyerTotal * 0.5);
  const max = Math.floor(Math.min(balance, cap));
  const [amount, setAmount] = useState<number>(max);
  if (max <= 0) return null;
  return (
    <div className="mb-4 rounded-2xl bg-[hsl(var(--primary)/0.06)] border border-[hsl(var(--primary)/0.25)] p-4">
      <div className="flex items-center justify-between mb-2 gap-3">
        <div className="text-[12.5px] font-semibold text-foreground inline-flex items-center gap-1.5">
          <Wallet className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />
          Apply GETX Coins
        </div>
        <div className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground tabular-nums">
          Bal {formatMoney(balance, currency)}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={max}
          step={1}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="flex-1 accent-[hsl(var(--primary))]"
        />
        <span className="font-display text-[15px] font-extrabold tabular-nums text-[hsl(var(--primary))] min-w-[80px] text-right">
          -{formatMoney(amount, currency)}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Up to 50% of order ({formatMoney(cap, currency)})</span>
        <button
          type="button"
          onClick={() => onApply(amount)}
          disabled={busy || amount <= 0}
          className="font-semibold text-[hsl(var(--primary))] hover:underline disabled:opacity-50"
        >
          {busy ? 'Applying…' : 'Apply'}
        </button>
      </div>
    </div>
  );
}

/* Apply loyalty points to a pending order. Renders a slider 0…maxPoints
   with a live USD preview (1 pt = $0.01). Server enforces the same cap
   so we never let the buyer apply more than `maxPoints`. */
function ApplyLoyaltyRow({
  balance,
  maxPoints,
  currency,
  onApply,
  busy,
}: {
  balance: number;
  maxPoints: number;
  currency: string;
  onApply: (points: number) => void;
  busy: boolean;
}) {
  const [points, setPoints] = useState<number>(maxPoints);
  if (maxPoints <= 0) return null;
  const usdValue = points / 100;
  return (
    <div className="mb-4 rounded-2xl bg-[hsl(280_85%_60%/0.06)] border border-[hsl(280_85%_60%/0.25)] p-4">
      <div className="flex items-center justify-between mb-2 gap-3">
        <div className="text-[12.5px] font-semibold text-foreground inline-flex items-center gap-1.5">
          <Star className="h-3.5 w-3.5 text-[hsl(280_85%_60%)] fill-current" />
          Redeem loyalty points
        </div>
        <div className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground tabular-nums">
          Bal {balance.toLocaleString('en-US')} pts
        </div>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={maxPoints}
          step={50}
          value={points}
          onChange={(e) => setPoints(Number(e.target.value))}
          className="flex-1 accent-[hsl(280_85%_60%)]"
          aria-label="Points to redeem"
        />
        <span className="font-display text-[15px] font-extrabold tabular-nums text-[hsl(280_85%_60%)] min-w-[110px] text-right">
          {points.toLocaleString('en-US')}
          <span className="text-[11px] font-medium text-muted-foreground ml-1">
            (-{formatMoney(usdValue, currency)})
          </span>
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Up to 50% of subtotal · 1 pt = $0.01</span>
        <button
          type="button"
          onClick={() => onApply(points)}
          disabled={busy || points <= 0}
          className="font-semibold text-[hsl(280_85%_60%)] hover:underline disabled:opacity-50"
        >
          {busy ? 'Redeeming…' : 'Redeem'}
        </button>
      </div>
    </div>
  );
}

/* Micro escrow flow — shows the 4 stages at a glance and highlights where
   the current order sits. Mirrors the Trust Theatre on the landing page, but
   compact so it lives comfortably on the order page. */
function EscrowMicroFlow({ status }: { status: OrderStatus }) {
  const reached: Record<OrderStatus, number> = {
    PENDING: 0,
    PAID: 1,
    IN_PROGRESS: 1,
    DELIVERED: 2,
    CONFIRMED: 3,
    COMPLETED: 3,
    CANCELLED: 0,
    DISPUTED: 1,
    REFUNDED: 0,
  };
  const cursor = reached[status];

  const stages = [
    { icon: Wallet, label: 'Pay' },
    { icon: Vault, label: 'Escrow' },
    { icon: Eye, label: 'Verify' },
    { icon: ArrowRight, label: 'Release' },
  ];

  return (
    <section className="surface-cinematic rounded-3xl p-5 md:p-6">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-4">
        Escrow flow
      </div>
      <div className="grid grid-cols-4 gap-2 md:gap-4">
        {stages.map((s, i) => {
          const done = i < cursor;
          const active = i === cursor;
          return (
            <div key={s.label} className="flex flex-col items-center text-center">
              <div
                className={`relative flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-2xl mb-2 transition-colors duration-ui ${
                  done
                    ? 'bg-success/20 text-success border border-success/40'
                    : active
                      ? 'bg-primary/20 text-primary border border-primary/40 shadow-[0_0_24px_-6px_hsl(var(--primary-glow)/0.6)]'
                      : 'bg-muted/15 text-muted-foreground border border-border'
                }`}
              >
                {done ? <CheckCircle2 className="h-5 w-5" /> : <s.icon className="h-4 w-4 md:h-5 md:w-5" />}
                {active ? (
                  <span className="absolute inset-0 rounded-2xl border border-primary/40 animate-pulse-glow" />
                ) : null}
              </div>
              <span
                className={`text-[10px] md:text-xs font-mono uppercase tracking-wider ${
                  done || active ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Timeline({ order }: { order: OrderDetail }) {
  const events: Array<{ label: string; date?: string | null; done: boolean; icon: React.ComponentType<{ className?: string }> }> = [
    { label: 'Order created', date: order.createdAt, done: true, icon: Sparkles },
    {
      label: 'Payment received',
      date: order.paymentCapturedAt,
      done: !!order.paymentCapturedAt,
      icon: Wallet,
    },
    {
      label: 'Marked as delivered',
      date: order.deliveredAt,
      done: !!order.deliveredAt,
      icon: Truck,
    },
    {
      label: 'Receipt confirmed',
      date: order.confirmedAt,
      done: !!order.confirmedAt,
      icon: CheckCircle2,
    },
  ];

  return (
    <ol className="space-y-4">
      {events.map((event, i) => (
        <li key={i} className="flex items-start gap-4">
          <div className="flex flex-col items-center">
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                event.done
                  ? 'bg-success/15 text-success border border-success/30'
                  : 'bg-muted/10 text-muted-foreground border border-border'
              }`}
            >
              {event.done ? <event.icon className="h-4 w-4" /> : <CircleDashed className="h-4 w-4" />}
            </span>
            {i < events.length - 1 ? (
              <span
                className={`mt-2 h-7 w-px ${event.done ? 'bg-gradient-to-b from-success/40 to-success/10' : 'bg-border/40'}`}
              />
            ) : null}
          </div>
          <div className="flex-1 pt-1.5">
            <div
              className={`font-display text-sm font-semibold ${
                event.done ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              {event.label}
            </div>
            {event.date ? (
              <div className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                {new Date(event.date).toLocaleString()}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground mt-0.5">Pending</div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
