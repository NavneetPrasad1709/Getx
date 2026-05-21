'use client';

import * as React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button, toast } from '@getx/ui';
import { Header } from '@/components/header';
import { gateCheckout } from '@/lib/feature-flags';
import { LandingFooter } from '@/components/landing/landing-footer';
import {
  useListing,
  useRelatedListings,
  type ListingDetail,
  type ListingVariant,
} from '@/hooks/use-listings';
import {
  Gallery,
  SpecSheet,
  SellerCard,
  BuyPanel,
  ListingDetailHeader,
  ListingDetailSkeleton,
  RelatedSection,
  RelatedSkeleton,
  type SpecRow,
} from '@/components/listings/listing-detail';
import { VariantPicker } from '@/components/listings/variant-picker';
import { CheckoutDrawer } from '@/components/listings/checkout-drawer';

function attrString(attrs: Record<string, unknown>, key: string): string | null {
  const v = attrs[key];
  return typeof v === 'string' ? v : null;
}

/* When the backend doesn't ship explicit variants on a top-up listing, stub
   three packages around the listing's current price so the picker UX is
   testable end-to-end. Drop this once the variants table lands. */
function stubVariants(listing: ListingDetail): ListingVariant[] {
  const base = listing.price;
  const baseOriginal = listing.originalPrice ?? null;

  const round = (n: number) => Math.round(n / 10) * 10;

  return [
    {
      id: 'pkg-sm',
      label: '5,500 PokéCoins',
      sublabel: 'Starter pack',
      price: round(base * 0.4),
      originalPrice: round(base * 0.45),
      stockLeft: 12,
      deliveryEta: listing.deliveryTime ?? null,
    },
    {
      id: 'pkg-md',
      label: '14,500 PokéCoins',
      sublabel: 'Most popular',
      price: base,
      originalPrice: baseOriginal,
      stockLeft: 5,
      deliveryEta: listing.deliveryTime ?? null,
      badge: 'Most popular',
    },
    {
      id: 'pkg-lg',
      label: '25,000 PokéCoins',
      sublabel: 'Best value · +12% bonus',
      price: round(base * 1.5),
      originalPrice: round(base * 1.85),
      stockLeft: 8,
      deliveryEta: listing.deliveryTime ?? null,
      badge: 'Best value',
    },
  ];
}

export default function TopUpDetailPage() {
  const params = useParams<{ slug: string }>();
  const search = useSearchParams();
  const slug = params.slug;

  const { data: listing, isLoading, error } = useListing(slug);
  const { data: related } = useRelatedListings(slug);
  const [checkoutOpen, setCheckoutOpen] = React.useState(false);

  /* Variant list — real if backend ships them, else stub for visibility */
  const variants = React.useMemo<ListingVariant[]>(() => {
    if (!listing) return [];
    if (listing.variants && listing.variants.length > 1) return listing.variants;
    /* Only stub for top-ups so other PDPs don't accidentally pick up package
       cards. tabType is the safest gate. */
    if (listing.tabType === 'TOP_UPS') return stubVariants(listing);
    return [];
  }, [listing]);

  /* Default = cheapest (or first in list) */
  const cheapestId = React.useMemo(() => {
    if (variants.length === 0) return null;
    const sorted = [...variants].sort((a, b) => a.price - b.price);
    return sorted[0]!.id;
  }, [variants]);

  /* Read ?v= once at mount; later updates flow through state */
  const initialVariantId = React.useMemo(() => {
    const fromUrl = search.get('v');
    if (fromUrl && variants.some((v) => v.id === fromUrl)) return fromUrl;
    return cheapestId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cheapestId]);

  const [activeVariantId, setActiveVariantId] = React.useState<string | null>(
    initialVariantId,
  );

  /* Keep state in sync when initial resolves after listing fetches */
  React.useEffect(() => {
    if (!activeVariantId && initialVariantId) {
      setActiveVariantId(initialVariantId);
    }
  }, [initialVariantId, activeVariantId]);

  const activeVariant =
    variants.find((v) => v.id === activeVariantId) ?? null;

  /* Shallow URL sync — no scroll, no re-render trigger. Uses window history
     directly because router.replace would invoke server data fetches. */
  const onSelectVariant = React.useCallback(
    (id: string) => {
      setActiveVariantId(id);
      if (typeof window === 'undefined') return;
      const url = new URL(window.location.href);
      url.searchParams.set('v', id);
      window.history.replaceState(null, '', url.toString());
    },
    [],
  );

  /* BuyPanel + UrgencyStrip read from listing fields. Override them with the
     active variant's data so the price/stock/delivery line all switch when a
     buyer flips packages. */
  const derivedListing = React.useMemo<ListingDetail | null>(() => {
    if (!listing) return null;
    if (!activeVariant) return listing;
    const discountPct =
      activeVariant.originalPrice && activeVariant.originalPrice > activeVariant.price
        ? Math.round(
            ((activeVariant.originalPrice - activeVariant.price) /
              activeVariant.originalPrice) *
              100,
          )
        : null;
    return {
      ...listing,
      price: activeVariant.price,
      originalPrice: activeVariant.originalPrice ?? null,
      discountPercent: discountPct,
      stockLeft: activeVariant.stockLeft ?? listing.stockLeft ?? null,
      deliveryTime: activeVariant.deliveryEta ?? listing.deliveryTime,
    };
  }, [listing, activeVariant]);

  const onBuy = gateCheckout(() => setCheckoutOpen(true), toast);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container pt-24 pb-20">
          <ListingDetailSkeleton />
        </main>
        <LandingFooter />
      </div>
    );
  }

  if (error || !listing || !derivedListing) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container pt-24 pb-20 flex items-center justify-center">
          <div className="text-center max-w-md">
            <h1 className="font-display text-3xl font-bold mb-3">Top-up not found</h1>
            <p className="text-muted-foreground mb-8">This listing may have been sold or removed.</p>
            <Link href="/games/pokemon-go/top-ups">
              <Button size="lg" className="rounded-full">Browse all top-ups</Button>
            </Link>
          </div>
        </main>
        <LandingFooter />
      </div>
    );
  }

  const a = listing.attributes;
  const rows: SpecRow[] = [];
  /* Active variant overrides the coin-amount spec row */
  const variantCoinAmount = activeVariant?.label ?? null;
  const coinAmount = variantCoinAmount ?? attrString(a, 'coinAmount');
  if (coinAmount) rows.push({ label: 'Coin amount', value: <span className="tabular-nums">{coinAmount}</span> });
  const deliveryMethod = attrString(a, 'deliveryMethod');
  if (deliveryMethod) rows.push({ label: 'Delivery method', value: deliveryMethod });
  const platform = attrString(a, 'platform');
  if (platform) rows.push({ label: 'Platform', value: platform });

  const hasPicker = variants.length > 1;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container pt-24 pb-20">
        <ListingDetailHeader
          listing={derivedListing}
          trail={[
            { href: '/', label: 'Home' },
            { href: '/games/pokemon-go', label: 'Pokémon GO' },
            { href: '/games/pokemon-go/top-ups', label: 'Top-ups' },
            { label: derivedListing.title },
          ]}
        />

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 lg:gap-12">
          <div className="space-y-8 min-w-0">
            <Gallery images={listing.images ?? []} title={listing.title} fallbackChar="$" />

            <SpecSheet rows={rows} title="Top-up details" />

            <section className="rounded-3xl border border-border/50 bg-surface/60 backdrop-blur p-6 md:p-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg font-semibold">Description</h2>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Seller-written
                </span>
              </div>
              <p className="whitespace-pre-line text-sm md:text-base text-foreground/85 leading-relaxed">
                {listing.description}
              </p>
            </section>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            {hasPicker && activeVariantId ? (
              <div className="rounded-3xl border border-border/50 bg-surface/60 backdrop-blur p-5 md:p-6">
                <VariantPicker
                  variants={variants}
                  activeId={activeVariantId}
                  currency={listing.currency}
                  onSelect={onSelectVariant}
                />
              </div>
            ) : null}
            <BuyPanel listing={derivedListing} onBuy={onBuy} />
            <SellerCard listing={derivedListing} />
          </aside>
        </div>

        {related ? (
          <RelatedSection related={related} title="Similar top-ups" hrefBase="/games/pokemon-go/top-ups" />
        ) : (
          <RelatedSkeleton />
        )}
      </main>

      <CheckoutDrawer
        listing={derivedListing}
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        variantId={activeVariantId ?? undefined}
        activeVariant={activeVariant}
      />

      <LandingFooter />
    </div>
  );
}
