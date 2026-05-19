'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AxiosError } from 'axios';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Eye,
  EyeOff,
  ImageOff,
  Info,
  Loader2,
  Lock,
  Package,
  Receipt,
  ShieldCheck,
  Truck,
  Wallet,
} from 'lucide-react';
import { Input, Skeleton, motion, toast } from '@getx/ui';
import { SellerShell } from '@/components/seller-shell';
import {
  useMarkDelivered,
  useSellerOrder,
  type EscrowStatus,
  type OrderStatus,
  type SellerOrderDetail,
} from '@/hooks/use-seller-orders';
import { ChatButton } from '@/components/chat/chat-button';

/* GETX Seller — Order Detail.
   ─────────────────────────────────────────────────────────────────────
   Operationally critical. Sellers land here from the queue to ACT —
   start delivery, hand over credentials, watch the auto-release clock.

   Layout: two columns on desktop, single column on mobile.

     LEFT (workflow):
       - Status banner with action context
       - Listing snapshot (image + title + price)
       - Buyer card
       - Mark-as-delivered form (only when PAID / IN_PROGRESS)
       - Waiting state with auto-release countdown
       - Completed state

     RIGHT (sidebar):
       - Earnings breakdown (uses actual commission from API, not hardcoded)
       - Open chat CTA
       - Timeline with deltas
*/

const EASE = [0.22, 1, 0.36, 1] as const;

function snapshotTitle(order: SellerOrderDetail): string {
  return (
    order.productListing?.title ??
    order.customRequest?.title ??
    order.paymentMetadata?.snapshotTitle ??
    `Order ${order.orderNumber}`
  );
}

function extractMessage(err: unknown): string | null {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { message?: string } | undefined;
    return data?.message ?? null;
  }
  return null;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SellerOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { data: order, isLoading } = useSellerOrder(id);
  const markDelivered = useMarkDelivered();

  const [proofImagesText, setProofImagesText] = useState('');
  const [notes, setNotes] = useState('');
  const [credUsername, setCredUsername] = useState('');
  const [credPassword, setCredPassword] = useState('');
  const [credExtra, setCredExtra] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  if (isLoading) {
    return (
      <SellerShell>
        <div className="px-4 sm:px-6 lg:px-10 py-8 max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-32 rounded-2xl" />
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
            <Skeleton className="h-96 rounded-3xl" />
            <Skeleton className="h-60 rounded-3xl" />
          </div>
        </div>
      </SellerShell>
    );
  }

  if (!order) {
    return (
      <SellerShell>
        <div className="px-4 sm:px-6 lg:px-10 py-10 max-w-3xl mx-auto">
          <div className="rounded-3xl bg-surface ring-1 ring-border p-12 text-center">
            <div className="grid place-items-center h-14 w-14 rounded-full bg-muted/30 text-muted-foreground mx-auto mb-3">
              <Package className="h-6 w-6" />
            </div>
            <h2 className="font-display text-2xl font-bold mb-2">Order not found</h2>
            <p className="text-[13px] text-muted-foreground mb-6">
              The order may have been removed, or the link is wrong.
            </p>
            <Link
              href="/orders"
              className="inline-flex items-center gap-1.5 h-11 px-5 rounded-full bg-gradient-to-b from-primary to-primary-hover text-primary-foreground text-[13.5px] font-bold shadow-[0_10px_28px_-6px_hsl(var(--primary)/0.55)]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to orders
            </Link>
          </div>
        </div>
      </SellerShell>
    );
  }

  const canMarkDelivered = order.status === 'PAID' || order.status === 'IN_PROGRESS';
  /* Show credentials field only for account-type orders — buyers of
     accounts need login info, top-ups / items do not. */
  const isAccountListing =
    order.productListing && /account/i.test(order.productListing.title);

  const handleMarkDelivered = async (e: React.FormEvent) => {
    e.preventDefault();
    const proofImages = proofImagesText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 5);
    const credentials =
      credUsername && credPassword
        ? {
            username: credUsername,
            password: credPassword,
            extra: credExtra || undefined,
          }
        : undefined;
    try {
      await markDelivered.mutateAsync({
        id: order.id,
        payload: { proofImages, notes: notes || undefined, credentials },
      });
      toast.success('Order marked delivered. Buyer notified.');
    } catch (err) {
      toast.error(extractMessage(err) ?? 'Failed to mark delivered');
    }
  };

  const title = snapshotTitle(order);
  /* Commission percentage taken from the API response — not hardcoded.
     Falls back to "fee" wording when amount is 0 so we don't pretend
     to know the rate. */
  const commissionPct =
    order.amount > 0 ? (order.sellerCommission / order.amount) * 100 : 0;

  return (
    <SellerShell>
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } } }}
        className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-5xl mx-auto space-y-5 lg:space-y-6"
      >
        {/* ── BREADCRUMB ─────────────────────────────────────────────── */}
        <motion.div variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } } }}>
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground mb-1">
            <Link href="/orders" className="hover:text-foreground transition-colors">
              Orders
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-mono">{order.orderNumber}</span>
          </div>
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <h1 className="font-display text-2xl lg:text-3xl font-extrabold tracking-tight truncate">
                {title}
              </h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <StatusPill status={order.status} />
                <EscrowChip status={order.escrowStatus} />
                <span className="font-mono text-[11px] text-muted-foreground">
                  Placed {formatDate(order.createdAt)}
                </span>
              </div>
            </div>
            <Link
              href="/orders"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-muted/25 hover:bg-muted/40 text-[12.5px] font-semibold transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </Link>
          </div>
        </motion.div>

        {/* ── STATUS BANNER ──────────────────────────────────────────── */}
        <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } } }}>
          <StatusBanner order={order} />
        </motion.div>

        {/* ── BODY GRID ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 lg:gap-6">
          {/* LEFT — workflow */}
          <div className="space-y-5">
            {/* Listing snapshot */}
            <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } } }}>
              <ListingSnapshot order={order} />
            </motion.div>

            {/* Buyer card */}
            <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } } }}>
              <BuyerCard order={order} />
            </motion.div>

            {/* Action block — varies by status */}
            {canMarkDelivered && (
              <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } } }}>
                <DeliverForm
                  isAccountListing={!!isAccountListing}
                  proofImagesText={proofImagesText}
                  setProofImagesText={setProofImagesText}
                  notes={notes}
                  setNotes={setNotes}
                  credUsername={credUsername}
                  setCredUsername={setCredUsername}
                  credPassword={credPassword}
                  setCredPassword={setCredPassword}
                  credExtra={credExtra}
                  setCredExtra={setCredExtra}
                  showPassword={showPassword}
                  setShowPassword={setShowPassword}
                  submitting={markDelivered.isPending}
                  onSubmit={handleMarkDelivered}
                />
              </motion.div>
            )}

            {order.status === 'DELIVERED' && (
              <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } } }}>
                <DeliveredCard order={order} />
              </motion.div>
            )}

            {(order.status === 'COMPLETED' || order.status === 'CONFIRMED') && (
              <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } } }}>
                <CompletedCard order={order} />
              </motion.div>
            )}
          </div>

          {/* RIGHT — sidebar */}
          <aside className="lg:sticky lg:top-24 self-start space-y-4">
            <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } } }}>
              <EarningsCard order={order} commissionPct={commissionPct} />
            </motion.div>

            {order.status !== 'CANCELLED' && order.status !== 'PENDING' && (
              <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } } }}>
                <div className="rounded-2xl bg-surface ring-1 ring-border p-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary font-bold mb-2">
                    Buyer chat
                  </div>
                  <ChatButton
                    orderId={order.id}
                    label="Open chat with buyer"
                    variant="default"
                    className="w-full"
                  />
                </div>
              </motion.div>
            )}

            <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } } }}>
              <Timeline order={order} />
            </motion.div>
          </aside>
        </div>
      </motion.div>
    </SellerShell>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  STATUS BANNER — coaches the seller on the next step                 */
/* ══════════════════════════════════════════════════════════════════ */
function StatusBanner({ order }: { order: SellerOrderDetail }) {
  const meta = BANNERS[order.status];
  if (!meta) return null;
  const Icon = meta.icon;
  return (
    <div
      className={`relative overflow-hidden rounded-2xl ring-1 ${meta.ring} ${meta.bg} p-5 flex items-start gap-4`}
    >
      <motion.div
        aria-hidden
        className={`absolute -top-12 -right-12 h-44 w-44 rounded-full blur-3xl ${meta.blob}`}
        animate={{ scale: [1, 1.06, 1], opacity: [0.4, 0.6, 0.4] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div
        className={`relative grid place-items-center h-12 w-12 rounded-2xl shrink-0 ${meta.iconBg}`}
      >
        <Icon className="h-5 w-5" strokeWidth={2.25} />
      </div>
      <div className="relative flex-1 min-w-0">
        <div className={`font-display font-extrabold text-[16px] leading-tight ${meta.title}`}>
          {meta.label}
        </div>
        <div className="text-[12.5px] text-muted-foreground mt-0.5">{meta.body}</div>
      </div>
    </div>
  );
}

const BANNERS: Record<
  OrderStatus,
  { label: string; body: string; icon: typeof Truck; bg: string; ring: string; iconBg: string; title: string; blob: string } | null
> = {
  PENDING: {
    label: 'Awaiting payment',
    body: 'Buyer hasn’t completed checkout yet.',
    icon: Clock,
    bg: 'bg-gradient-to-br from-muted/30 to-surface',
    ring: 'ring-border',
    iconBg: 'bg-muted/40 text-muted-foreground',
    title: 'text-foreground',
    blob: 'bg-muted/30',
  },
  PAID: {
    label: 'Buyer paid — start delivery now',
    body: 'Same-day delivery is the GETX standard. Don’t make them wait.',
    icon: Truck,
    bg: 'bg-gradient-to-br from-hot/12 via-surface to-surface',
    ring: 'ring-hot/25',
    iconBg: 'bg-hot/15 text-hot',
    title: 'text-foreground',
    blob: 'bg-hot/15',
  },
  IN_PROGRESS: {
    label: 'In progress',
    body: 'Finish fulfilling, then mark as delivered.',
    icon: Loader2,
    bg: 'bg-gradient-to-br from-primary/10 via-surface to-surface',
    ring: 'ring-primary/25',
    iconBg: 'bg-primary/15 text-primary',
    title: 'text-foreground',
    blob: 'bg-primary/15',
  },
  DELIVERED: {
    label: 'Delivered — awaiting buyer confirm',
    body: 'Funds auto-release if the buyer doesn’t confirm within 3 days.',
    icon: Clock,
    bg: 'bg-gradient-to-br from-accent/10 via-surface to-surface',
    ring: 'ring-accent/25',
    iconBg: 'bg-accent/15 text-accent',
    title: 'text-foreground',
    blob: 'bg-accent/15',
  },
  CONFIRMED: {
    label: 'Confirmed',
    body: 'Funds released to your wallet.',
    icon: CheckCircle2,
    bg: 'bg-gradient-to-br from-success/10 via-surface to-surface',
    ring: 'ring-success/25',
    iconBg: 'bg-success/15 text-success',
    title: 'text-foreground',
    blob: 'bg-success/15',
  },
  COMPLETED: {
    label: 'Completed',
    body: 'Order closed and paid out.',
    icon: CheckCircle2,
    bg: 'bg-gradient-to-br from-success/10 via-surface to-surface',
    ring: 'ring-success/25',
    iconBg: 'bg-success/15 text-success',
    title: 'text-foreground',
    blob: 'bg-success/15',
  },
  CANCELLED: {
    label: 'Cancelled',
    body: 'This order will not be fulfilled.',
    icon: AlertTriangle,
    bg: 'bg-gradient-to-br from-muted/30 to-surface',
    ring: 'ring-border',
    iconBg: 'bg-muted/40 text-muted-foreground',
    title: 'text-muted-foreground',
    blob: 'bg-muted/30',
  },
  DISPUTED: {
    label: 'Dispute open',
    body: 'GETX support will reach out. Keep chat civil and provide proof.',
    icon: AlertTriangle,
    bg: 'bg-gradient-to-br from-error/10 via-surface to-surface',
    ring: 'ring-error/25',
    iconBg: 'bg-error/15 text-error',
    title: 'text-foreground',
    blob: 'bg-error/15',
  },
  REFUNDED: {
    label: 'Refunded',
    body: 'Funds returned to the buyer. No payout for this order.',
    icon: AlertTriangle,
    bg: 'bg-gradient-to-br from-warning/10 via-surface to-surface',
    ring: 'ring-warning/25',
    iconBg: 'bg-warning/15 text-warning',
    title: 'text-foreground',
    blob: 'bg-warning/15',
  },
};

/* ══════════════════════════════════════════════════════════════════ */
/*  LISTING SNAPSHOT                                                    */
/* ══════════════════════════════════════════════════════════════════ */
function ListingSnapshot({ order }: { order: SellerOrderDetail }) {
  const img = order.productListing?.images?.[0];
  const tag = order.productListing
    ? `SKU ${order.productListing.sku}`
    : order.customRequest
      ? `Request ${order.customRequest.requestNumber}`
      : 'Custom order';
  return (
    <div className="rounded-2xl bg-surface ring-1 ring-border overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-border">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary font-bold">
          What was sold
        </div>
      </div>
      <div className="p-4 flex items-center gap-4">
        <div className="relative h-20 w-20 rounded-xl bg-muted/40 overflow-hidden shrink-0 ring-1 ring-border">
          {img ? (
            <Image src={img} alt="" fill sizes="80px" className="object-cover" unoptimized />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-muted-foreground">
              <ImageOff className="h-5 w-5 opacity-60" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display font-bold text-[15px] truncate">
            {snapshotTitle(order)}
          </div>
          <div className="font-mono text-[11px] text-muted-foreground mt-0.5">{tag}</div>
          <div className="mt-2 font-display font-extrabold text-[20px] tabular-nums leading-none">
            ${order.amount.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  BUYER CARD                                                          */
/* ══════════════════════════════════════════════════════════════════ */
function BuyerCard({ order }: { order: SellerOrderDetail }) {
  const initial = (order.buyer.name ?? order.buyer.username ?? '?').charAt(0).toUpperCase();
  return (
    <div className="rounded-2xl bg-surface ring-1 ring-border p-4 sm:p-5">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary font-bold mb-3">
        Buyer
      </div>
      <div className="flex items-center gap-3">
        <div className="grid place-items-center h-11 w-11 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 text-foreground font-bold text-[13px] ring-2 ring-surface">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[14px] truncate">
            {order.buyer.username ?? order.buyer.name ?? '—'}
          </div>
          {order.buyer.email && (
            <div className="text-[11.5px] text-muted-foreground truncate">{order.buyer.email}</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  DELIVER FORM                                                        */
/* ══════════════════════════════════════════════════════════════════ */
function DeliverForm({
  isAccountListing,
  proofImagesText,
  setProofImagesText,
  notes,
  setNotes,
  credUsername,
  setCredUsername,
  credPassword,
  setCredPassword,
  credExtra,
  setCredExtra,
  showPassword,
  setShowPassword,
  submitting,
  onSubmit,
}: {
  isAccountListing: boolean;
  proofImagesText: string;
  setProofImagesText: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  credUsername: string;
  setCredUsername: (v: string) => void;
  credPassword: string;
  setCredPassword: (v: string) => void;
  credExtra: string;
  setCredExtra: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-3xl bg-surface ring-1 ring-border overflow-hidden"
    >
      <div className="px-5 pt-5 pb-2 flex items-center gap-2">
        <div className="grid place-items-center h-8 w-8 rounded-lg bg-primary/10 text-primary">
          <Truck className="h-4 w-4" strokeWidth={2.25} />
        </div>
        <div>
          <h3 className="font-display font-bold text-[15px] leading-tight">Mark as delivered</h3>
          <div className="text-[11.5px] text-muted-foreground">
            Send proof + (for account orders) credentials.
          </div>
        </div>
      </div>

      <div className="px-5 py-5 space-y-5">
        {/* Proof images */}
        <div>
          <label className="text-[13px] font-semibold block mb-1.5">
            Proof image URLs <span className="text-muted-foreground font-normal">— max 5, one per line</span>
          </label>
          <textarea
            value={proofImagesText}
            onChange={(e) => setProofImagesText(e.target.value)}
            placeholder={'https://example.com/proof-1.jpg\nhttps://example.com/proof-2.jpg'}
            rows={3}
            className="w-full rounded-xl bg-surface ring-1 ring-border focus:bg-surface focus:ring-primary/40 px-3.5 py-3 text-[13px] font-mono outline-none transition-all"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="text-[13px] font-semibold block mb-1.5">
            Delivery notes <span className="text-muted-foreground font-normal">— optional</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything the buyer needs to know to start using the order…"
            rows={3}
            maxLength={2000}
            className="w-full rounded-xl bg-surface ring-1 ring-border focus:ring-primary/40 px-3.5 py-3 text-[13px] outline-none transition-all"
          />
        </div>

        {/* Credentials (only for account-type orders) */}
        {isAccountListing && (
          <div className="rounded-2xl bg-gradient-to-br from-warning/8 to-surface ring-1 ring-warning/20 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-warning" strokeWidth={2.5} />
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-warning font-bold">
                Account credentials
              </span>
              <span className="text-[11px] text-muted-foreground ml-auto">Only the buyer sees this</span>
            </div>
            <Input
              placeholder="Username / email"
              value={credUsername}
              onChange={(e) => setCredUsername(e.target.value)}
              className="h-10 text-[13px]"
            />
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={credPassword}
                onChange={(e) => setCredPassword(e.target.value)}
                className="h-10 text-[13px] pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
            <Input
              placeholder="Extra info (recovery email, 2FA codes, etc.)"
              value={credExtra}
              onChange={(e) => setCredExtra(e.target.value)}
              className="h-10 text-[13px]"
            />
            <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
              <Info className="h-3 w-3 shrink-0 mt-0.5" />
              Encrypted at rest. Only this buyer can decrypt these fields.
            </div>
          </div>
        )}
      </div>

      <div className="px-5 pb-5">
        <motion.button
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.97 }}
          type="submit"
          disabled={submitting}
          className="
            w-full inline-flex items-center justify-center gap-1.5 h-12 px-5 rounded-full
            bg-gradient-to-b from-primary to-primary-hover
            text-primary-foreground text-[14px] font-bold tracking-tight
            shadow-[0_10px_28px_-6px_hsl(var(--primary)/0.55)]
            hover:shadow-[0_14px_36px_-6px_hsl(var(--primary)/0.65)]
            disabled:opacity-50 disabled:cursor-not-allowed transition-all
          "
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Marking delivered…
            </>
          ) : (
            <>
              <Truck className="h-4 w-4" strokeWidth={2.5} />
              Mark as delivered
            </>
          )}
        </motion.button>
      </div>
    </form>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  DELIVERED CARD — countdown to auto-release                          */
/* ══════════════════════════════════════════════════════════════════ */
function DeliveredCard({ order }: { order: SellerOrderDetail }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const releaseAt = order.autoReleaseAt ? new Date(order.autoReleaseAt).getTime() : null;
  const diff = releaseAt ? releaseAt - now : 0;
  const hoursLeft = Math.max(0, Math.floor(diff / 3_600_000));
  const daysLeft = Math.floor(hoursLeft / 24);
  const remainingHours = hoursLeft % 24;

  return (
    <div className="rounded-3xl bg-gradient-to-br from-accent/10 via-surface to-surface ring-1 ring-accent/20 p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="h-4 w-4 text-accent" strokeWidth={2.5} />
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent font-bold">
          Awaiting buyer confirmation
        </span>
      </div>
      <h3 className="font-display font-extrabold text-xl mb-2">Funds release soon</h3>
      <p className="text-[13px] text-muted-foreground mb-5">
        You delivered on {formatDate(order.deliveredAt)}. If the buyer doesn&apos;t confirm within
        3 days, GETX auto-releases the funds to your wallet.
      </p>
      {releaseAt && diff > 0 && (
        <div className="rounded-2xl bg-accent/8 ring-1 ring-accent/20 px-4 py-3 flex items-center gap-3">
          <motion.div
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="grid place-items-center h-10 w-10 rounded-xl bg-accent/15 text-accent"
          >
            <Clock className="h-4 w-4" strokeWidth={2.5} />
          </motion.div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-bold">
              Auto-release in
            </div>
            <div className="font-display font-extrabold text-[20px] tabular-nums leading-none">
              {daysLeft > 0 ? `${daysLeft}d ${remainingHours}h` : `${hoursLeft}h`}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  COMPLETED CARD                                                      */
/* ══════════════════════════════════════════════════════════════════ */
function CompletedCard({ order }: { order: SellerOrderDetail }) {
  return (
    <div className="rounded-3xl bg-gradient-to-br from-success/10 via-surface to-surface ring-1 ring-success/20 p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-3">
        <CheckCircle2 className="h-4 w-4 text-success" strokeWidth={2.5} />
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-success font-bold">
          Paid out
        </span>
      </div>
      <h3 className="font-display font-extrabold text-xl mb-1">Order complete</h3>
      <p className="text-[13px] text-muted-foreground mb-4">
        Confirmed on {formatDate(order.confirmedAt)}.{' '}
        <span className="text-foreground font-bold">${order.sellerAmount.toFixed(2)}</span> was
        added to your wallet.
      </p>
      <Link
        href="/wallet"
        className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-success text-success-foreground text-[13px] font-bold hover:opacity-90 transition-opacity"
      >
        <Wallet className="h-4 w-4" strokeWidth={2.5} />
        Open wallet
      </Link>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  EARNINGS CARD                                                       */
/* ══════════════════════════════════════════════════════════════════ */
function EarningsCard({
  order,
  commissionPct,
}: {
  order: SellerOrderDetail;
  commissionPct: number;
}) {
  return (
    <div className="rounded-2xl bg-surface ring-1 ring-border p-5">
      <div className="flex items-center gap-2 mb-4">
        <Receipt className="h-4 w-4 text-primary" strokeWidth={2.5} />
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary font-bold">
          Earnings
        </span>
      </div>
      <div className="space-y-2.5 text-[13px]">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Buyer paid</span>
          <span className="font-mono tabular-nums">${order.buyerTotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Buyer fee</span>
          <span className="font-mono tabular-nums">−${order.buyerFee.toFixed(2)}</span>
        </div>
        <div className="flex justify-between border-t border-border pt-2.5">
          <span>Order subtotal</span>
          <span className="font-mono tabular-nums">${order.amount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>
            GETX commission{commissionPct > 0 ? ` (${commissionPct.toFixed(0)}%)` : ''}
          </span>
          <span className="font-mono tabular-nums">−${order.sellerCommission.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold pt-3 border-t border-border">
          <span className="font-display">Your payout</span>
          <span className="font-display text-success text-[16px] tabular-nums">
            ${order.sellerAmount.toFixed(2)}
          </span>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-border flex items-start gap-1.5 text-[11px] text-muted-foreground">
        <ShieldCheck className="h-3 w-3 shrink-0 mt-0.5" />
        Held in escrow until release.
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  TIMELINE                                                            */
/* ══════════════════════════════════════════════════════════════════ */
function Timeline({ order }: { order: SellerOrderDetail }) {
  const events: { label: string; iso: string | null | undefined; done: boolean }[] = [
    { label: 'Order placed', iso: order.createdAt, done: true },
    { label: 'Payment captured', iso: order.paymentCapturedAt, done: !!order.paymentCapturedAt },
    { label: 'Delivered', iso: order.deliveredAt, done: !!order.deliveredAt },
    {
      label: 'Confirmed',
      iso: order.confirmedAt,
      done: order.status === 'COMPLETED' || order.status === 'CONFIRMED',
    },
  ];
  return (
    <div className="rounded-2xl bg-surface ring-1 ring-border p-5">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-4 w-4 text-primary" strokeWidth={2.5} />
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary font-bold">
          Timeline
        </span>
      </div>
      <ol className="space-y-3 relative">
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" aria-hidden />
        {events.map((e, i) => (
          <li key={i} className="relative flex gap-3 pl-1">
            <div
              className={`grid place-items-center h-4 w-4 rounded-full shrink-0 z-10 ring-2 ring-surface ${
                e.done ? 'bg-primary' : 'bg-muted/40'
              }`}
            >
              {e.done && <Copy className="h-2 w-2 text-primary-foreground opacity-0" />}
            </div>
            <div className="flex-1 min-w-0 -mt-0.5">
              <div
                className={`text-[12.5px] font-semibold leading-tight ${
                  e.done ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {e.label}
              </div>
              <div className="text-[10.5px] text-muted-foreground font-mono mt-0.5">
                {formatDate(e.iso)}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  CHIPS                                                               */
/* ══════════════════════════════════════════════════════════════════ */
function StatusPill({ status }: { status: OrderStatus }) {
  const styles: Record<OrderStatus, { bg: string; label: string }> = {
    PENDING: { bg: 'bg-muted/40 text-muted-foreground ring-border', label: 'Pending' },
    PAID: { bg: 'bg-hot/15 text-hot ring-hot/25', label: 'New · Paid' },
    IN_PROGRESS: { bg: 'bg-primary/15 text-primary ring-primary/25', label: 'In progress' },
    DELIVERED: { bg: 'bg-accent/15 text-accent ring-accent/25', label: 'Delivered' },
    CONFIRMED: { bg: 'bg-success/15 text-success ring-success/25', label: 'Confirmed' },
    COMPLETED: { bg: 'bg-success/15 text-success ring-success/25', label: 'Completed' },
    CANCELLED: { bg: 'bg-muted/40 text-muted-foreground ring-border', label: 'Cancelled' },
    DISPUTED: { bg: 'bg-error/15 text-error ring-error/25', label: 'Disputed' },
    REFUNDED: { bg: 'bg-warning/15 text-warning ring-warning/25', label: 'Refunded' },
  };
  const s = styles[status];
  const live = status === 'PAID' || status === 'IN_PROGRESS';
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ring-1 ${s.bg} font-mono text-[9.5px] uppercase tracking-[0.18em] font-bold`}
    >
      {live && <span className="h-1 w-1 rounded-full bg-current animate-pulse" />}
      {s.label}
    </span>
  );
}

function EscrowChip({ status }: { status: EscrowStatus }) {
  const labels: Record<EscrowStatus, { label: string; tone: string }> = {
    PENDING: { label: 'Pre-escrow', tone: 'text-muted-foreground' },
    HELD: { label: 'In escrow', tone: 'text-accent' },
    RELEASED: { label: 'Released', tone: 'text-success' },
    REFUNDED: { label: 'Refunded', tone: 'text-warning' },
    PARTIAL: { label: 'Partial', tone: 'text-warning' },
  };
  const l = labels[status];
  return (
    <span
      className={`inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em] font-bold ${l.tone}`}
    >
      <ShieldCheck className="h-3 w-3" strokeWidth={2.5} />
      {l.label}
    </span>
  );
}
