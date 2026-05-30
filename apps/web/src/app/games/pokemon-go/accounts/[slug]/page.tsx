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
import { MobileBuyBar } from '@/components/listings/mobile-buy-bar';
import { CheckoutDrawer } from '@/components/listings/checkout-drawer';

function attrString(attrs: Record<string, unknown>, key: string): string | null {
  const v = attrs[key];
  return typeof v === 'string' ? v : null;
}
function attrNumber(attrs: Record<string, unknown>, key: string): number | null {
  const v = attrs[key];
  return typeof v === 'number' ? v : null;
}

export default function AccountDetailPage() {
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
        <main id="main" className="flex-1 container pt-24 pb-20">
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
        <main id="main" className="flex-1 container pt-24 pb-20 flex items-center justify-center">
          <div className="text-center max-w-md">
            <h1 className="font-display text-3xl font-bold mb-3">Listing not found</h1>
            <p className="text-muted-foreground mb-8">This listing may have been sold or removed.</p>
            <Link href="/games/pokemon-go/accounts">
              <Button size="lg" className="rounded-full">Browse all accounts</Button>
            </Link>
          </div>
        </main>
        <LandingFooter />
      </div>
    );
  }

  const a = listing.attributes;
  const rows: SpecRow[] = [];
  const level = attrNumber(a, 'level');
  if (level !== null) rows.push({ label: 'Level', value: <span className="tabular-nums">{level}</span> });
  const team = attrString(a, 'team');
  if (team) rows.push({ label: 'Team', value: team });
  const shiny = attrNumber(a, 'shinyCount');
  if (shiny !== null) rows.push({ label: 'Shinies', value: <span className="tabular-nums">{shiny}</span> });
  const legendary = attrNumber(a, 'legendaryCount');
  if (legendary !== null) rows.push({ label: 'Legendaries', value: <span className="tabular-nums">{legendary}</span> });
  const mythical = attrNumber(a, 'mythicalCount');
  if (mythical !== null) rows.push({ label: 'Mythicals', value: <span className="tabular-nums">{mythical}</span> });
  const hundo = attrNumber(a, 'hundoCount');
  if (hundo !== null) rows.push({ label: '100% IV Pokémon', value: <span className="tabular-nums">{hundo}</span> });
  const masterTrainer = attrNumber(a, 'masterTrainerCount');
  if (masterTrainer !== null) rows.push({ label: 'Master Trainer medals', value: <span className="tabular-nums">{masterTrainer}</span> });
  const region = attrString(a, 'region');
  if (region) rows.push({ label: 'Region', value: region });
  const platform = attrString(a, 'platform');
  if (platform) rows.push({ label: 'Platform', value: platform });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://getx.live';
  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: listing.title,
    description: listing.description,
    sku: listing.sku,
    image: listing.images?.length ? listing.images : undefined,
    brand: { '@type': 'Brand', name: 'Pokémon GO' },
    offers: {
      '@type': 'Offer',
      url: `${siteUrl}/games/pokemon-go/accounts/${listing.slug ?? listing.id}`,
      priceCurrency: listing.currency || 'USD',
      price: listing.price,
      availability:
        listing.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Person',
        name: listing.seller.username ?? listing.seller.name ?? 'GetX Verified Seller',
      },
    },
    aggregateRating:
      listing.seller.totalSales > 0
        ? {
            '@type': 'AggregateRating',
            ratingValue: listing.seller.sellerRating,
            reviewCount: listing.seller.totalSales,
          }
        : undefined,
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      {/* WEB-MED-037: escape </script> sequences that could break out of the JSON-LD tag */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd).replace(/</g, '\u003c').replace(/>/g, '\u003e').replace(/&/g, '\u0026') }}
      />

      <main id="main" className="flex-1 container pt-24 pb-20">
        <ListingDetailHeader
          listing={listing}
          trail={[
            { href: '/', label: 'Home' },
            { href: '/games/pokemon-go', label: 'Pokémon GO' },
            { href: '/games/pokemon-go/accounts', label: 'Accounts' },
            { label: listing.title },
          ]}
        />

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 lg:gap-12">
          <div className="space-y-8 min-w-0">
            <Gallery images={listing.images ?? []} title={listing.title} fallbackChar="⬡" />

            <SpecSheet rows={rows} title="Account specs" />

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
              {listing.searchTags.length > 0 && (
                <div className="mt-6 pt-6 border-t border-border/40 flex flex-wrap gap-1.5">
                  {listing.searchTags.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded-md bg-surface-elevated font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <BuyPanel listing={listing} onBuy={onBuy} />
            <SellerCard listing={listing} />
          </aside>
        </div>

        {related ? (
          <RelatedSection
            related={related}
            title="Similar accounts"
            hrefBase="/games/pokemon-go/accounts"
          />
        ) : (
          <RelatedSkeleton />
        )}
      </main>

      <MobileBuyBar listing={listing} onBuy={onBuy} />

      <CheckoutDrawer
        listing={listing}
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
      />

      <LandingFooter />
    </div>
  );
}
