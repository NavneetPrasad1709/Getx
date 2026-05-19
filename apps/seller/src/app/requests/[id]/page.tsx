'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  Clock,
  DollarSign,
  Flame,
  Info,
  Layers,
  Lightbulb,
  Loader2,
  MapPin,
  Send,
  Sparkles,
  Trophy,
  Users,
  Wallet as WalletIcon,
  XCircle,
  Zap,
} from 'lucide-react';
import { Input, Skeleton, motion, toast } from '@getx/ui';
import { SellerShell } from '@/components/seller-shell';
import { useRequest, type RequestDetail, type RequestOffer } from '@/hooks/use-seller-requests';
import { useCreateOffer } from '@/hooks/use-seller-offers';
import { useAuth } from '@/hooks/use-auth';
import { ChatButton } from '@/components/chat/chat-button';

/* GETX Seller — Request Detail (bid page).
   ─────────────────────────────────────────────────────────────────────
   The conversion screen for the reverse-market flow. Sellers land
   here from /requests to pitch on a buyer's open need.

   Layout:
     LEFT — request body (game, category, description, attributes)
     RIGHT — bid form (sticky), with state-aware copy for:
       • not seller   → activate prompt
       • own request  → can't bid
       • my offer     → show status + chat
       • not open     → closed message
       • else         → bid form with budget guidance + tips
*/

const EASE = [0.22, 1, 0.36, 1] as const;

function humanize(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function extractAxiosMessage(err: unknown): string | null {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { message?: string } | undefined;
    return data?.message ?? null;
  }
  return null;
}

function hoursUntil(iso: string): number {
  return (new Date(iso).getTime() - Date.now()) / 3_600_000;
}

function timeLeft(iso: string): { label: string; tone: 'hot' | 'warning' | 'muted' } {
  const h = hoursUntil(iso);
  if (h <= 0) return { label: 'Expired', tone: 'muted' };
  if (h < 24) return { label: `${Math.floor(h)}h ${Math.floor((h % 1) * 60)}m left`, tone: 'hot' };
  const d = Math.floor(h / 24);
  if (d < 3) return { label: `${d}d left`, tone: 'warning' };
  return { label: `${d}d left`, tone: 'muted' };
}

function prettyCategory(s: string | null): string | null {
  if (!s) return null;
  return s
    .split('-')
    .map((w) => (w.length > 0 ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(' ');
}

export default function RequestDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const { user } = useAuth();
  const isSeller = !!user?.isSeller;

  const { data: request, isLoading } = useRequest(id);
  const createOffer = useCreateOffer();

  const [price, setPrice] = useState('');
  const [deliveryHours, setDeliveryHours] = useState('24');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const myOffer = request?.offers?.find((o) => o.sellerId === user?.id);
  const isOwnRequest = request?.buyer.id === user?.id;

  /* Suggested price = midpoint of budget. Auto-prefill once the
     request data arrives, but only when seller can bid + hasn't typed. */
  useEffect(() => {
    if (!request || price || myOffer || isOwnRequest || !isSeller) return;
    const mid = (request.budgetMin + request.budgetMax) / 2;
    setPrice(mid.toFixed(2));
  }, [request, price, myOffer, isOwnRequest, isSeller]);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    const p = parseFloat(price);
    if (!p || p < 1) e.price = 'Price required';
    if (request && p > request.budgetMax * 1.5) {
      e.price = `Max allowed: $${(request.budgetMax * 1.5).toFixed(2)}`;
    }
    const h = parseInt(deliveryHours, 10);
    if (!h || h < 1) e.deliveryHours = 'Required';
    if (h > 720) e.deliveryHours = 'Max 720 hours (30 days)';
    if (!message || message.length < 20) e.message = 'Pitch must be at least 20 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      await createOffer.mutateAsync({
        requestId: id,
        price: parseFloat(price),
        deliveryHours: parseInt(deliveryHours, 10),
        message,
      });
      toast.success('Offer submitted! Buyer notified.');
      router.push('/offers');
    } catch (err) {
      toast.error(extractAxiosMessage(err) ?? 'Failed to submit offer');
    }
  };

  if (isLoading) {
    return (
      <SellerShell>
        <div className="px-4 sm:px-6 lg:px-10 py-8 max-w-5xl mx-auto space-y-5">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-32 rounded-2xl" />
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">
            <Skeleton className="h-96 rounded-3xl" />
            <Skeleton className="h-96 rounded-3xl" />
          </div>
        </div>
      </SellerShell>
    );
  }

  if (!request) {
    return (
      <SellerShell>
        <div className="px-4 sm:px-6 lg:px-10 py-10 max-w-3xl mx-auto">
          <div className="rounded-3xl bg-surface ring-1 ring-border p-12 text-center">
            <div className="grid place-items-center h-14 w-14 rounded-full bg-muted/30 text-muted-foreground mx-auto mb-3">
              <Briefcase className="h-6 w-6" />
            </div>
            <h2 className="font-display text-2xl font-bold mb-2">Request not found</h2>
            <p className="text-[13px] text-muted-foreground mb-6">
              The buyer may have closed it, or the link is wrong.
            </p>
            <Link
              href="/requests"
              className="inline-flex items-center gap-1.5 h-11 px-5 rounded-full bg-gradient-to-b from-primary to-primary-hover text-primary-foreground text-[13.5px] font-bold shadow-[0_10px_28px_-6px_hsl(var(--primary)/0.55)]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to requests
            </Link>
          </div>
        </div>
      </SellerShell>
    );
  }

  const tl = timeLeft(request.expiresAt);
  const sub = prettyCategory(request.subCategory);
  const buyerInitial = (request.buyer.username ?? request.buyer.name ?? '?')
    .slice(0, 1)
    .toUpperCase();

  return (
    <SellerShell>
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } } }}
        className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-5xl mx-auto space-y-5"
      >
        {/* ── BREADCRUMB ─────────────────────────────────────────────── */}
        <motion.div variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } } }}>
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground mb-1">
            <Link href="/requests" className="hover:text-foreground transition-colors">
              Open requests
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-mono">{request.requestNumber}</span>
          </div>
        </motion.div>

        {/* ── HEADER ─────────────────────────────────────────────────── */}
        <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } } }}>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <CategoryChip type={request.tabType} />
            {sub && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted/30 ring-1 ring-border font-mono text-[9.5px] uppercase tracking-[0.18em] text-foreground/80 font-bold">
                {sub}
              </span>
            )}
            <TimeLeftChip tone={tl.tone} label={tl.label} />
            {request.status !== 'OPEN' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/40 text-muted-foreground font-mono text-[9.5px] uppercase tracking-[0.18em] font-bold ring-1 ring-border">
                <XCircle className="h-3 w-3" strokeWidth={2.5} />
                {request.status}
              </span>
            )}
          </div>
          <h1 className="font-display text-2xl lg:text-3xl font-extrabold tracking-tight leading-tight">
            {request.title}
          </h1>
        </motion.div>

        {/* ── BODY ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5 lg:gap-6">
          {/* LEFT — request body */}
          <div className="space-y-5">
            <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } } }}>
              <div className="rounded-3xl bg-surface ring-1 ring-border p-5 sm:p-6">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary font-bold mb-3">
                  Buyer description
                </div>
                <p className="text-[14px] text-foreground whitespace-pre-line leading-relaxed">
                  {request.description}
                </p>
              </div>
            </motion.div>

            {Object.keys(request.attributes).length > 0 && (
              <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } } }}>
                <div className="rounded-3xl bg-surface ring-1 ring-border p-5 sm:p-6">
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary font-bold mb-4">
                    Specifics
                  </div>
                  <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {Object.entries(request.attributes).map(([key, value]) => (
                      <div key={key}>
                        <dt className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground font-bold mb-1">
                          {humanize(key)}
                        </dt>
                        <dd className="font-semibold text-[13.5px] text-foreground break-words">
                          {Array.isArray(value) ? value.join(', ') : String(value)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </motion.div>
            )}

            <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } } }}>
              <div className="rounded-3xl bg-surface ring-1 ring-border p-5 sm:p-6">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary font-bold mb-4">
                  Job parameters
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <StatTile
                    icon={DollarSign}
                    label="Budget"
                    value={
                      request.budgetMin === request.budgetMax
                        ? `$${request.budgetMin}`
                        : `$${request.budgetMin}–$${request.budgetMax}`
                    }
                  />
                  <StatTile icon={Clock} label="Delivery" value={`${request.deliveryDays}d max`} />
                  <StatTile icon={Users} label="Offers" value={request.offerCount} />
                  <StatTile icon={MapPin} label="Buyer" value={request.buyer.country || '—'} />
                </div>
                <div className="mt-4 pt-4 border-t border-border flex items-center gap-3">
                  <div className="grid place-items-center h-8 w-8 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 text-foreground font-bold text-[11px]">
                    {buyerInitial}
                  </div>
                  <div className="text-[12px]">
                    <div className="font-semibold">
                      {request.buyer.username ?? request.buyer.name ?? '—'}
                    </div>
                    <div className="text-muted-foreground">Buyer · {request.game.name}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* RIGHT — bid form (sticky) */}
          <aside className="lg:sticky lg:top-24 self-start space-y-4">
            <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } } }}>
              <BidPanel
                isSeller={isSeller}
                isOwnRequest={isOwnRequest}
                myOffer={myOffer}
                request={request}
                price={price}
                setPrice={setPrice}
                deliveryHours={deliveryHours}
                setDeliveryHours={setDeliveryHours}
                message={message}
                setMessage={setMessage}
                errors={errors}
                submitting={createOffer.isPending}
                onSubmit={handleSubmit}
              />
            </motion.div>

            {/* Tips */}
            {!myOffer && !isOwnRequest && isSeller && request.status === 'OPEN' && (
              <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } } }}>
                <div className="rounded-2xl bg-gradient-to-br from-accent/10 via-surface to-surface ring-1 ring-accent/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="h-4 w-4 text-accent" strokeWidth={2.5} />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent font-bold">
                      Pitch tips
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    <li className="flex gap-2 text-[12px] text-foreground/85 leading-snug">
                      <span className="text-accent shrink-0 mt-0.5">•</span>
                      Lead with experience — &ldquo;Pushed 30+ accounts to Master&rdquo; beats a generic intro.
                    </li>
                    <li className="flex gap-2 text-[12px] text-foreground/85 leading-snug">
                      <span className="text-accent shrink-0 mt-0.5">•</span>
                      Beat the buyer&apos;s expected delivery by 25% if you can.
                    </li>
                    <li className="flex gap-2 text-[12px] text-foreground/85 leading-snug">
                      <span className="text-accent shrink-0 mt-0.5">•</span>
                      Stay inside budget — going over rarely wins.
                    </li>
                  </ul>
                </div>
              </motion.div>
            )}
          </aside>
        </div>
      </motion.div>
    </SellerShell>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  BID PANEL                                                           */
/* ══════════════════════════════════════════════════════════════════ */
function BidPanel({
  isSeller,
  isOwnRequest,
  myOffer,
  request,
  price,
  setPrice,
  deliveryHours,
  setDeliveryHours,
  message,
  setMessage,
  errors,
  submitting,
  onSubmit,
}: {
  isSeller: boolean;
  isOwnRequest: boolean;
  myOffer: RequestOffer | undefined;
  request: RequestDetail;
  price: string;
  setPrice: (v: string) => void;
  deliveryHours: string;
  setDeliveryHours: (v: string) => void;
  message: string;
  setMessage: (v: string) => void;
  errors: Record<string, string>;
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}) {
  if (!isSeller) {
    return (
      <div className="rounded-3xl bg-surface ring-1 ring-border p-5 text-center">
        <div className="grid place-items-center h-12 w-12 rounded-2xl bg-primary/10 text-primary mx-auto mb-3">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="font-display font-bold text-[15px] mb-1">Activate seller mode</div>
        <p className="text-[12.5px] text-muted-foreground mb-4">
          You need an active seller profile to bid.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-primary text-primary-foreground text-[12.5px] font-bold"
        >
          Go to dashboard
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }
  if (isOwnRequest) {
    return (
      <div className="rounded-3xl bg-muted/15 ring-1 ring-border p-5 text-center">
        <Info className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
        <div className="font-semibold text-[13.5px] mb-0.5">This is your request</div>
        <p className="text-[12px] text-muted-foreground">Sellers can&apos;t bid on their own.</p>
      </div>
    );
  }
  if (myOffer) {
    const tones: Record<string, { bg: string; text: string }> = {
      PENDING: { bg: 'bg-accent/15 ring-accent/25', text: 'text-accent' },
      ACCEPTED: { bg: 'bg-success/15 ring-success/25', text: 'text-success' },
      REJECTED: { bg: 'bg-error/15 ring-error/25', text: 'text-error' },
      WITHDRAWN: { bg: 'bg-muted/40 ring-border', text: 'text-muted-foreground' },
    };
    const t = tones[myOffer.status] ?? tones.PENDING;
    return (
      <div className="rounded-3xl bg-surface ring-1 ring-border overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" strokeWidth={2.5} />
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary font-bold">
            Your bid
          </span>
        </div>
        <div className="px-5 pb-5 space-y-4">
          <div className="rounded-2xl bg-muted/15 ring-1 ring-border p-4">
            <div className="flex items-baseline justify-between mb-2">
              <span className="font-display font-extrabold text-[28px] tabular-nums leading-none">
                ${myOffer.price.toFixed(2)}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ring-1 ${t.bg} ${t.text} font-mono text-[9.5px] uppercase tracking-[0.18em] font-bold`}
              >
                {myOffer.status}
              </span>
            </div>
            <div className="text-[11.5px] text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3 w-3" strokeWidth={2.5} />
              {myOffer.deliveryHours}h delivery
            </div>
          </div>
          <ChatButton
            offerId={myOffer.id}
            label="Open chat with buyer"
            variant="default"
            className="w-full"
          />
          <Link
            href="/offers"
            className="inline-flex items-center justify-center gap-1.5 w-full h-10 rounded-full bg-muted/25 hover:bg-muted/40 text-[12.5px] font-semibold transition-colors"
          >
            See all my offers
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    );
  }
  if (request.status !== 'OPEN') {
    return (
      <div className="rounded-3xl bg-muted/15 ring-1 ring-border p-5 text-center">
        <XCircle className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
        <div className="font-semibold text-[13.5px] mb-0.5">No longer accepting offers</div>
        <p className="text-[12px] text-muted-foreground">
          This request is {request.status.toLowerCase()}.
        </p>
      </div>
    );
  }

  /* Active bid form. */
  const priceN = parseFloat(price) || 0;
  const fee = priceN * 0.08;
  const youKeep = priceN - fee;
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-3xl bg-surface ring-1 ring-border overflow-hidden"
    >
      <div className="px-5 pt-5 pb-3 flex items-center gap-2">
        <div className="grid place-items-center h-8 w-8 rounded-lg bg-primary/10 text-primary">
          <Send className="h-4 w-4" strokeWidth={2.25} />
        </div>
        <div>
          <h3 className="font-display font-bold text-[15px] leading-tight">Submit your bid</h3>
          <div className="text-[11px] text-muted-foreground">Inside budget wins more.</div>
        </div>
      </div>

      <div className="px-5 pb-5 space-y-4">
        <div>
          <label className="text-[12.5px] font-semibold flex items-center justify-between mb-1.5">
            <span>Your price (USD)</span>
            <span className="font-mono text-[10px] text-muted-foreground">
              Budget ${request.budgetMin}–${request.budgetMax}
            </span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-display font-bold">
              $
            </span>
            <Input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={`${((request.budgetMin + request.budgetMax) / 2).toFixed(0)}`}
              min={1}
              step={0.01}
              className="pl-7 h-11 text-[14px] font-display font-bold tabular-nums"
            />
          </div>
          {errors.price && <FieldError msg={errors.price} />}
        </div>

        <div>
          <label className="text-[12.5px] font-semibold block mb-1.5">Delivery (hours)</label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="number"
              value={deliveryHours}
              onChange={(e) => setDeliveryHours(e.target.value)}
              min={1}
              max={720}
              className="pl-9 h-11 text-[14px] tabular-nums"
            />
          </div>
          {errors.deliveryHours && <FieldError msg={errors.deliveryHours} />}
        </div>

        <div>
          <label className="text-[12.5px] font-semibold flex items-center justify-between mb-1.5">
            <span>Pitch · why you?</span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {message.length}/2000
            </span>
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Convince the buyer in 2–4 sentences. Mention experience, turnaround, anything unique."
            rows={5}
            maxLength={2000}
            className="w-full rounded-xl bg-surface ring-1 ring-border focus:ring-primary/40 px-3.5 py-3 text-[13px] outline-none transition-all resize-none"
          />
          {errors.message && <FieldError msg={errors.message} />}
        </div>

        {priceN > 0 && (
          <div className="rounded-2xl bg-primary/5 ring-1 ring-primary/15 p-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary font-bold mb-2">
              If accepted
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="font-display font-extrabold text-[16px] tabular-nums leading-none">
                  ${priceN.toFixed(0)}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
                  Buyer pays
                </div>
              </div>
              <div className="border-l border-border">
                <div className="font-display font-bold text-[16px] tabular-nums leading-none text-muted-foreground">
                  −${fee.toFixed(0)}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
                  Fee 8%
                </div>
              </div>
              <div className="border-l border-border">
                <div className="font-display font-extrabold text-[16px] tabular-nums leading-none text-success">
                  ${youKeep.toFixed(0)}
                </div>
                <div className="text-[10px] text-success uppercase tracking-wider mt-1 font-bold">
                  You keep
                </div>
              </div>
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
            text-primary-foreground text-[13.5px] font-bold tracking-tight
            shadow-[0_10px_28px_-6px_hsl(var(--primary)/0.55)]
            hover:shadow-[0_14px_36px_-6px_hsl(var(--primary)/0.65)]
            disabled:opacity-50 disabled:cursor-not-allowed transition-all
          "
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting…
            </>
          ) : (
            <>
              <Send className="h-4 w-4" strokeWidth={2.5} />
              Submit bid
            </>
          )}
        </motion.button>
      </div>
    </form>
  );
}

function FieldError({ msg }: { msg: string }) {
  return (
    <p className="text-error text-[11.5px] mt-1.5 flex items-center gap-1">
      <Info className="h-3 w-3" />
      {msg}
    </p>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  STAT TILE + CHIPS                                                   */
/* ══════════════════════════════════════════════════════════════════ */
function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string | number;
}) {
  return (
    <div>
      <div className="grid place-items-center h-8 w-8 rounded-lg bg-primary/10 text-primary mb-2">
        <Icon className="h-4 w-4" strokeWidth={2.25} />
      </div>
      <div className="font-display font-extrabold text-[18px] tabular-nums leading-none mb-0.5">
        {value}
      </div>
      <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground font-bold">
        {label}
      </div>
    </div>
  );
}

function CategoryChip({ type }: { type: RequestDetail['tabType'] }) {
  const meta: Record<RequestDetail['tabType'], { label: string; icon: typeof Layers; tone: string }> = {
    ACCOUNTS: { label: 'Accounts', icon: Layers, tone: 'bg-primary/12 text-primary' },
    TOP_UPS: { label: 'Top-Ups', icon: WalletIcon, tone: 'bg-accent/12 text-accent' },
    ITEMS: { label: 'Items', icon: Boxes, tone: 'bg-success/12 text-success' },
    BOOSTING: { label: 'Boosting', icon: Zap, tone: 'bg-hot/12 text-hot' },
  };
  const m = meta[type];
  const Icon = m.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md ${m.tone} font-mono text-[9.5px] uppercase tracking-[0.18em] font-bold`}
    >
      <Icon className="h-3 w-3" strokeWidth={2.5} />
      {m.label}
    </span>
  );
}

function TimeLeftChip({ tone, label }: { tone: 'hot' | 'warning' | 'muted'; label: string }) {
  const tones: Record<string, string> = {
    hot: 'bg-hot/12 text-hot ring-hot/25',
    warning: 'bg-warning/12 text-warning ring-warning/25',
    muted: 'bg-muted/30 text-muted-foreground ring-border',
  };
  if (tone === 'hot') {
    return (
      <motion.span
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ring-1 ${tones[tone]} font-mono text-[9.5px] uppercase tracking-[0.18em] font-bold`}
      >
        <Flame className="h-3 w-3" strokeWidth={2.5} />
        {label}
      </motion.span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ring-1 ${tones[tone]} font-mono text-[9.5px] uppercase tracking-[0.18em] font-bold`}
    >
      <Clock className="h-3 w-3" strokeWidth={2.5} />
      {label}
    </span>
  );
}

/* Silence unused — keep CheckCircle2 import on hand for future. */
void CheckCircle2;
