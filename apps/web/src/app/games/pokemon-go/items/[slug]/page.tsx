'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button, toast } from '@getx/ui';
import { Header } from '@/components/header';
import { gateCheckout } from '@/lib/feature-flags';
import { LandingFooter } from '@/components/landing/landing-footer';
import { useListing, useRelatedListings } from '@/hooks/use-listings';
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
import { CheckoutDrawer } from '@/components/listings/checkout-drawer';

function attrString(attrs: Record<string, unknown>, key: string): string | null {
  const v = attrs[key];
  return typeof v === 'string' ? v : null;
}
function attrNumber(attrs: Record<string, unknown>, key: string): number | null {
  const v = attrs[key];
  return typeof v === 'number' ? v : null;
}

export default function ItemDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const { data: listing, isLoading, error } = useListing(slug);
  const { data: related } = useRelatedListings(slug);
  const [checkoutOpen, setCheckoutOpen] = React.useState(false);

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

  if (error || !listing) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container pt-24 pb-20 flex items-center justify-center">
          <div className="text-center max-w-md">
            <h1 className="font-display text-3xl font-bold mb-3">Bundle not found</h1>
            <p className="text-muted-foreground mb-8">This listing may have been sold or removed.</p>
            <Link href="/games/pokemon-go/items">
              <Button size="lg" className="rounded-full">Browse all items</Button>
            </Link>
          </div>
        </main>
        <LandingFooter />
      </div>
    );
  }

  const a = listing.attributes;
  const itemTypes = Array.isArray(a.itemTypes)
    ? (a.itemTypes.filter((t) => typeof t === 'string') as string[])
    : [];
  const totalQuantity = attrNumber(a, 'totalQuantity');
  const breakdown = attrString(a, 'breakdown');

  const rows: SpecRow[] = [];
  if (totalQuantity !== null) rows.push({ label: 'Total quantity', value: <span className="tabular-nums">{totalQuantity} items</span> });
  if (itemTypes.length > 0) {
    rows.push({
      label: 'Item types',
      value: (
        <div className="flex flex-wrap gap-1.5">
          {itemTypes.map((t) => (
            <span key={t} className="px-2 py-0.5 rounded-md bg-surface-elevated font-mono text-[10px] uppercase tracking-wider">
              {t}
            </span>
          ))}
        </div>
      ),
    });
  }
  if (breakdown) rows.push({ label: 'Breakdown', value: <span className="whitespace-pre-line">{breakdown}</span> });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container pt-24 pb-20">
        <ListingDetailHeader
          listing={listing}
          trail={[
            { href: '/', label: 'Home' },
            { href: '/games/pokemon-go', label: 'Pokémon GO' },
            { href: '/games/pokemon-go/items', label: 'Items' },
            { label: listing.title },
          ]}
        />

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 lg:gap-12">
          <div className="space-y-8 min-w-0">
            <Gallery images={listing.images ?? []} title={listing.title} fallbackChar="◆" />

            <SpecSheet rows={rows} title="Bundle contents" />

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
            <BuyPanel listing={listing} onBuy={onBuy} />
            <SellerCard listing={listing} />
          </aside>
        </div>

        {related ? (
          <RelatedSection related={related} title="Similar bundles" hrefBase="/games/pokemon-go/items" />
        ) : (
          <RelatedSkeleton />
        )}
      </main>

      <CheckoutDrawer
        listing={listing}
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
      />

      <LandingFooter />
    </div>
  );
}
