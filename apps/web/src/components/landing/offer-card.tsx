'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Star, Zap, ShieldCheck, ArrowUpRight } from 'lucide-react';
import type { Listing } from '@/hooks/use-listings';
import { formatMoney } from '@/lib/currency';

/* OfferCard — Rockstar dark marketplace card.

   Image-led: 4:3 cover with overlay title and metadata floating bottom,
   yellow corner accent on hover. Footer strip with price + Buy CTA in
   Rockstar yellow uppercase. */

function placeholderFor(listing: Listing): string {
  if (listing.tabType === 'TOP_UPS') return '/placeholders/listing-topups.svg';
  if (listing.tabType === 'ITEMS') return '/placeholders/listing-items.svg';
  return '/placeholders/listing-accounts.svg';
}

function hrefFor(listing: Listing): string {
  const tab =
    listing.tabType === 'TOP_UPS'
      ? 'top-ups'
      : listing.tabType === 'ITEMS'
        ? 'items'
        : 'accounts';
  const slug = listing.slug ?? listing.id;
  return `/games/${listing.game.slug}/${tab}/${slug}`;
}

function flagFor(country: string | undefined | null): string {
  if (!country) return '🌐';
  const map: Record<string, string> = {
    IN: '🇮🇳', US: '🇺🇸', GB: '🇬🇧', DE: '🇩🇪', FR: '🇫🇷',
    CA: '🇨🇦', AU: '🇦🇺', JP: '🇯🇵', SG: '🇸🇬', PH: '🇵🇭',
    BR: '🇧🇷', MX: '🇲🇽',
  };
  return map[country.toUpperCase()] ?? '🌐';
}

export function OfferCard({ listing }: { listing: Listing }) {
  const cover = listing.images?.[0] ?? placeholderFor(listing);
  const seller = listing.seller;
  const handle = seller.username ?? seller.name ?? 'seller';
  const isAuto = listing.deliveryType === 'INSTANT' || listing.deliveryType === 'AUTO';

  return (
    <Link
      href={hrefFor(listing)}
      className="group block bg-[hsl(0_0%_5%)] border border-border/60 hover:border-primary transition-colors duration-ui ease-apple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {/* Cover */}
      <div className="relative aspect-[16/11] overflow-hidden bg-[hsl(0_0%_6%)]">
        <Image
          src={cover}
          alt={listing.title}
          fill
          sizes="(min-width: 1024px) 320px, (min-width: 640px) 50vw, 90vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
        />

        {/* Yellow corner accent */}
        <span
          aria-hidden
          className="absolute top-0 left-0 h-7 w-0 bg-primary transition-all duration-300 ease-out group-hover:w-7"
        />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1">
          {listing.discountPercent && listing.discountPercent >= 10 ? (
            <span className="px-2 py-0.5 bg-hot text-hot-foreground font-mono text-[10px] font-bold uppercase tracking-wider">
              -{listing.discountPercent}%
            </span>
          ) : null}
          {isAuto ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-black/85 text-primary border border-primary/40 font-mono text-[10px] font-bold uppercase tracking-wider">
              <Zap className="h-2.5 w-2.5" />
              Instant
            </span>
          ) : null}
        </div>

        {/* Bottom gradient + title */}
        <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black via-black/75 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <h3 className="font-display text-lg md:text-xl font-bold uppercase tracking-tight text-white leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {listing.title}
          </h3>
        </div>
      </div>

      {/* Body — seller + price + buy */}
      <div className="px-4 py-3 flex items-center gap-3 border-t border-border/60">
        {/* Seller */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="h-7 w-7 shrink-0 grid place-items-center bg-primary text-primary-foreground font-display text-sm font-bold leading-none">
            {handle.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-xs text-white truncate">@{handle}</div>
            <div className="inline-flex items-center gap-1 text-[10px] font-mono text-white/55">
              <Star className="h-2.5 w-2.5 text-primary fill-primary" />
              <span className="tabular-nums text-white/80">{seller.sellerRating.toFixed(2)}</span>
              {seller.isVerified ? <ShieldCheck className="h-2.5 w-2.5 text-success ml-0.5" /> : null}
              <span className="ml-0.5">{flagFor(seller.country)}</span>
            </div>
          </div>
        </div>

        {/* Price */}
        <div className="text-right shrink-0">
          <div className="font-display text-lg font-bold tabular-nums text-white leading-none">
            {formatMoney(listing.price, listing.currency)}
          </div>
          {listing.originalPrice && listing.originalPrice > listing.price ? (
            <div className="font-mono text-[9px] text-white/40 line-through tabular-nums mt-0.5">
              {formatMoney(listing.originalPrice, listing.currency)}
            </div>
          ) : null}
        </div>
      </div>

      {/* Buy footer strip */}
      <div className="px-4 py-2.5 bg-primary text-primary-foreground border-t border-primary flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.2em] font-bold">
        <span>Buy with escrow</span>
        <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>
    </Link>
  );
}

export function OfferCardSkeleton() {
  return (
    <div className="bg-[hsl(0_0%_5%)] border border-border/60">
      <div className="aspect-[16/11] bg-[hsl(0_0%_8%)] animate-pulse" />
      <div className="px-4 py-3 space-y-2 border-t border-border/60">
        <div className="h-3 w-2/3 bg-[hsl(0_0%_10%)] animate-pulse" />
        <div className="h-2.5 w-1/2 bg-[hsl(0_0%_10%)] animate-pulse" />
      </div>
      <div className="px-4 py-2.5 bg-[hsl(0_0%_8%)]">
        <div className="h-3 w-20 bg-[hsl(0_0%_12%)] animate-pulse" />
      </div>
    </div>
  );
}
