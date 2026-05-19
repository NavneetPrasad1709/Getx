import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ShieldCheck,
  Star,
  Clock,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';
import { Header } from '@/components/header';
import { LandingFooter } from '@/components/landing/landing-footer';
import { RankBadge, type Rank } from '@/components/badges/rank-badge';
import { ShareOfferButton } from '@/components/offers/share-offer-button';

/* Public read-only share view for a custom-request offer.

   Shareable at `https://getx.gg/o/{offerId}`. Buyer info is sanitised to
   first name + country before the page ever renders so a stranger
   stumbling on a shared URL can't fingerprint the buyer. Active offers
   show a "Sign in to respond" CTA; expired/accepted/withdrawn offers
   show a status pill and the "View on GETX" CTA links to the request
   detail (which gates further info behind auth). */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://getx.gg';

interface PublicOffer {
  id: string;
  price: number;
  currency: string;
  deliveryHours: number;
  message: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN' | 'EXPIRED';
  expiresAt: string;
  createdAt: string;
  request: {
    id: string;
    requestNumber: string;
    title: string;
    description: string;
    tabType: string;
    budgetMin: number | null;
    budgetMax: number | null;
    currency: string;
    expiresAt: string;
    game: { slug: string; name: string; icon: string | null };
  };
  seller: {
    id: string;
    username: string | null;
    name: string | null;
    avatar: string | null;
    bio: string | null;
    sellerRating: number;
    totalReviews: number;
    totalSales: number;
    verifiedTier: string | null;
    rank: Rank | null;
    isVerified: boolean;
    country: string;
    createdAt: string;
  };
  buyer: { firstName: string; country: string };
}

async function fetchPublicOffer(id: string): Promise<PublicOffer | null> {
  try {
    const res = await fetch(
      `${API_URL}/offers/${encodeURIComponent(id)}/public`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return null;
    return (await res.json()) as PublicOffer;
  } catch {
    return null;
  }
}

function formatPrice(amount: number, currency: string): string {
  const code = (currency || 'USD').toUpperCase();
  const zeroDec = ['JPY', 'KRW', 'INR'].includes(code);
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: zeroDec ? 0 : 2,
    }).format(amount);
  } catch {
    return `${code} ${amount.toFixed(zeroDec ? 0 : 2)}`;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ offerId: string }>;
}): Promise<Metadata> {
  const { offerId } = await params;
  const offer = await fetchPublicOffer(offerId);
  if (!offer) {
    return {
      title: 'Offer on GETX',
      description: 'Custom request offers on GETX.',
    };
  }
  const handle = offer.seller.username ?? offer.seller.name ?? 'a seller';
  const priceLabel = formatPrice(offer.price, offer.currency);
  const title = `${priceLabel} offer from @${handle} · GETX`;
  const description =
    offer.message.slice(0, 160) ||
    `${offer.request.title} · delivery in ${offer.deliveryHours}h.`;
  const ogImage = `${SITE_URL}/api/og/offer/${encodeURIComponent(offerId)}`;
  const canonical = `${SITE_URL}/o/${encodeURIComponent(offerId)}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: 'GETX',
      type: 'website',
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

const STATUS_INFO: Record<
  PublicOffer['status'],
  { label: string; surface: string; text: string }
> = {
  PENDING: {
    label: 'Active offer',
    surface: 'bg-[hsl(var(--success)/0.12)]',
    text: 'text-[hsl(var(--success))]',
  },
  ACCEPTED: {
    label: 'Accepted',
    surface: 'bg-[hsl(280_85%_60%/0.14)]',
    text: 'text-[hsl(280_85%_60%)]',
  },
  REJECTED: {
    label: 'Rejected',
    surface: 'bg-[hsl(var(--error)/0.14)]',
    text: 'text-[hsl(var(--error))]',
  },
  WITHDRAWN: {
    label: 'Withdrawn',
    surface: 'bg-[hsl(var(--muted-foreground)/0.14)]',
    text: 'text-[hsl(var(--muted-foreground))]',
  },
  EXPIRED: {
    label: 'Expired',
    surface: 'bg-[hsl(var(--muted-foreground)/0.14)]',
    text: 'text-[hsl(var(--muted-foreground))]',
  },
};

export default async function PublicOfferPage({
  params,
}: {
  params: Promise<{ offerId: string }>;
}) {
  const { offerId } = await params;
  const offer = await fetchPublicOffer(offerId);
  if (!offer) notFound();

  const handle = offer.seller.username ?? offer.seller.name ?? 'seller';
  const status = STATUS_INFO[offer.status];
  const memberSince = new Date(offer.seller.createdAt).getFullYear();
  const isLive =
    offer.status === 'PENDING' && new Date(offer.expiresAt) > new Date();
  const expiresInHours = Math.max(
    0,
    Math.floor(
      (new Date(offer.expiresAt).getTime() - Date.now()) / (60 * 60 * 1000),
    ),
  );
  const requestHref = `/requests/${offer.request.id}`;
  const shareUrl = `${SITE_URL}/o/${offerId}`;

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <Header />

      <section className="relative isolate overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--primary)/0.18)] via-transparent to-[hsl(280_85%_60%/0.1)]" />
        <div className="relative mx-auto max-w-[900px] px-4 sm:px-6 lg:px-8 py-10 md:py-14">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-4">
            <Link href="/" className="hover:text-foreground transition-colors">
              GETX
            </Link>
            <ChevronRight className="h-3 w-3" />
            <Link
              href={`/games/${offer.request.game.slug}`}
              className="hover:text-foreground transition-colors"
            >
              {offer.request.game.name}
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground/80">Offer</span>
          </div>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0 flex-1">
              <span
                className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider ${status.surface} ${status.text}`}
              >
                {status.label}
              </span>
              <h1 className="mt-3 font-display text-3xl md:text-5xl font-extrabold tracking-tight">
                {formatPrice(offer.price, offer.currency)}
                <span className="ml-3 text-[hsl(var(--muted-foreground))] text-lg md:text-2xl font-medium">
                  · delivery in {offer.deliveryHours}h
                </span>
              </h1>
              <p className="mt-3 text-sm md:text-base text-muted-foreground">
                Custom offer for{' '}
                <Link
                  href={requestHref}
                  className="font-semibold text-foreground hover:text-[hsl(var(--primary))]"
                >
                  &ldquo;{offer.request.title}&rdquo;
                </Link>{' '}
                · request #{offer.request.requestNumber}
              </p>
            </div>
            <ShareOfferButton offerId={offer.id} shareUrl={shareUrl} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[900px] px-4 sm:px-6 lg:px-8 py-10 md:py-14 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Left column — offer body + request summary */}
        <div className="space-y-5 min-w-0">
          <article className="surface-cinematic rounded-3xl p-6">
            <h2 className="font-display text-lg font-semibold mb-3">
              Seller&apos;s pitch
            </h2>
            <p className="text-[14px] text-foreground/85 whitespace-pre-wrap break-words">
              {offer.message}
            </p>
          </article>

          <article className="surface-cinematic rounded-3xl p-6">
            <h2 className="font-display text-lg font-semibold mb-3">
              Original request
            </h2>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-1">
                  Title
                </div>
                <div className="font-semibold">{offer.request.title}</div>
              </div>
              {offer.request.description ? (
                <div>
                  <div className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-1">
                    Description
                  </div>
                  <p className="text-foreground/80 whitespace-pre-wrap break-words">
                    {offer.request.description}
                  </p>
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border/40">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-1">
                    Budget
                  </div>
                  <div className="font-mono text-[13px] tabular-nums">
                    {offer.request.budgetMin !== null && offer.request.budgetMax !== null
                      ? `${formatPrice(offer.request.budgetMin, offer.request.currency)} – ${formatPrice(offer.request.budgetMax, offer.request.currency)}`
                      : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-1">
                    Posted by
                  </div>
                  <div className="font-mono text-[13px]">
                    {offer.buyer.firstName} · {offer.buyer.country}
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>

        {/* Right column — seller card + CTA */}
        <aside className="space-y-5">
          <article className="surface-cinematic rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="h-12 w-12 rounded-full grid place-items-center text-white font-bold text-base shrink-0"
                style={{
                  background:
                    'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary-hover)) 100%)',
                }}
              >
                {handle.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <Link
                    href={`/users/${handle}`}
                    className="font-display text-base font-bold truncate hover:text-[hsl(var(--primary))] transition-colors"
                  >
                    @{handle}
                  </Link>
                  {offer.seller.isVerified ? (
                    <ShieldCheck className="h-3.5 w-3.5 text-[hsl(var(--primary))] shrink-0" />
                  ) : null}
                </div>
                <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
                  <Star className="h-3 w-3 fill-[hsl(45_95%_55%)] text-[hsl(45_95%_55%)]" />
                  <span className="tabular-nums">
                    {offer.seller.sellerRating.toFixed(2)}
                  </span>
                  <span>·</span>
                  <span className="tabular-nums">
                    {offer.seller.totalSales} sales
                  </span>
                </div>
              </div>
            </div>
            {offer.seller.rank ? (
              <div className="mb-4">
                <RankBadge rank={offer.seller.rank} size="sm" />
              </div>
            ) : null}
            {offer.seller.bio ? (
              <p className="text-[12.5px] text-foreground/80 line-clamp-4">
                {offer.seller.bio}
              </p>
            ) : null}
            <div className="mt-4 grid grid-cols-2 gap-3 text-[11.5px]">
              <div>
                <div className="text-muted-foreground mb-0.5">Member since</div>
                <div className="font-mono tabular-nums">{memberSince}</div>
              </div>
              <div>
                <div className="text-muted-foreground mb-0.5">Reviews</div>
                <div className="font-mono tabular-nums">
                  {offer.seller.totalReviews}
                </div>
              </div>
            </div>
          </article>

          <article className="surface-cinematic rounded-3xl p-6">
            <h2 className="font-display text-base font-semibold mb-2">
              {isLive ? 'Respond to this offer' : 'Open on GETX'}
            </h2>
            {isLive ? (
              <p className="text-[12px] text-muted-foreground mb-4 inline-flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                Expires in ~{expiresInHours}h
              </p>
            ) : null}
            <Link
              href={requestHref}
              className="inline-flex items-center justify-center gap-1.5 w-full h-11 rounded-full bg-[hsl(var(--primary))] text-white text-[13px] font-semibold hover:bg-[hsl(var(--primary-hover))] transition-colors"
            >
              View on GETX
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <p className="mt-3 text-[11px] text-muted-foreground">
              GETX Shield holds funds in escrow until the buyer confirms
              delivery.
            </p>
          </article>
        </aside>
      </section>

      <LandingFooter />
    </div>
  );
}
