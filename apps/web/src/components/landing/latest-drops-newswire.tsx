'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { useListings, type Listing } from '@/hooks/use-listings';
import { formatMoney } from '@/lib/currency';

/* LatestDropsNewswire — Rockstar's "Newswire" feed adapted as
   a "Latest drops" wall.

   On rockstargames.com the Newswire is the visual anchor of the homepage —
   a grid of 16:9 cards, each with a clear thumbnail, a yellow uppercase
   tag, a bold headline, and a one-line excerpt. We mirror that pattern for
   our latest listings, which gives the page rhythm without feeling like
   yet-another-product-grid. */

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function tagFor(listing: Listing): string {
  if (listing.isFeatured) return 'Featured';
  if (listing.tabType === 'ACCOUNTS') return 'Account';
  if (listing.tabType === 'TOP_UPS') return 'Top-up';
  return 'Item';
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

export function LatestDropsNewswire() {
  const reduce = useReducedMotion();
  const { data } = useListings({
    gameSlug: 'pokemon-go',
    sort: 'newest',
    limit: 7,
  });
  const drops = data?.data ?? [];

  if (drops.length === 0) {
    return null; // newswire feels broken when empty; skip silently
  }

  const lead = drops[0];
  const rest = drops.slice(1, 7);

  return (
    <section
      aria-label="Latest drops"
      className="relative bg-black border-t border-border/60 py-20 md:py-28"
    >
      <div className="container">
        <div className="flex items-end justify-between mb-10 md:mb-14 gap-6 flex-wrap">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary mb-3">
              Latest drops
            </div>
            <h2 className="font-display font-bold uppercase leading-[0.9] tracking-[-0.01em] text-[clamp(2.5rem,6vw,5.5rem)] text-white">
              Just hit the wall.
            </h2>
          </div>
          <Link
            href="/games/pokemon-go/accounts"
            className="group inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-primary hairline-underline"
          >
            View everything
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        {/* Layout: 1 lead card (2/3 width) + 6 rail cards in two columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
          {/* Lead */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-2"
          >
            <NewsCard listing={lead} size="lead" />
          </motion.div>

          {/* Rail — 6 small */}
          <div className="grid grid-cols-2 lg:grid-cols-2 gap-4 md:gap-5">
            {rest.map((l, i) => (
              <motion.div
                key={l.id}
                initial={reduce ? false : { opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{
                  duration: 0.5,
                  delay: 0.05 * i,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <NewsCard listing={l} size="small" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

interface NewsCardProps {
  listing: Listing;
  size: 'lead' | 'small';
}

function placeholderFor(listing: Listing): string {
  if (listing.tabType === 'TOP_UPS') return '/placeholders/listing-topups.svg';
  if (listing.tabType === 'ITEMS') return '/placeholders/listing-items.svg';
  return '/placeholders/listing-accounts.svg';
}

function NewsCard({ listing, size }: NewsCardProps) {
  const cover = listing.images?.[0] ?? placeholderFor(listing);
  const isLead = size === 'lead';

  return (
    <Link
      href={hrefFor(listing)}
      className="group relative block overflow-hidden bg-black border border-border/40 hover:border-primary transition-colors duration-ui ease-apple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-black"
    >
      <div className={`relative ${isLead ? 'aspect-[16/10]' : 'aspect-[4/3]'} overflow-hidden bg-[hsl(0_0%_5%)]`}>
        <Image
          src={cover}
          alt={listing.title}
          fill
          sizes={isLead ? '(min-width: 1024px) 60vw, 100vw' : '(min-width: 1024px) 22vw, 50vw'}
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
        />
        {/* Gradient floor for legibility */}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/70 to-transparent" />

        {/* Yellow corner accent */}
        <span
          aria-hidden
          className="absolute top-0 left-0 h-8 w-0 bg-primary transition-all duration-300 ease-out group-hover:w-8"
        />
      </div>

      <div className={`absolute inset-x-0 bottom-0 ${isLead ? 'p-6 md:p-8' : 'p-4'}`}>
        <div className={`font-mono uppercase tracking-[0.22em] text-primary mb-2 ${isLead ? 'text-[11px]' : 'text-[10px]'}`}>
          {tagFor(listing)} · {timeAgo(listing.createdAt)}
        </div>
        <h3
          className={`font-display font-bold uppercase leading-[0.95] tracking-tight text-white line-clamp-2 ${
            isLead
              ? 'text-[clamp(1.75rem,3.5vw,2.75rem)]'
              : 'text-[clamp(1rem,1.8vw,1.5rem)]'
          }`}
        >
          {listing.title}
        </h3>
        {isLead ? (
          <p className="mt-2 max-w-xl text-sm text-white/70 line-clamp-2">
            {listing.attributes &&
            typeof listing.attributes.summary === 'string'
              ? (listing.attributes.summary as string)
              : 'Hand-picked drop from a verified seller. Escrow-protected · instant delivery.'}
          </p>
        ) : null}
        <div
          className={`mt-3 flex items-center justify-between font-mono uppercase tracking-wider ${
            isLead ? 'text-xs' : 'text-[10px]'
          } text-white/55`}
        >
          <span className="text-white">{formatMoney(listing.price, listing.currency)}</span>
          <span className="inline-flex items-center gap-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
            View <ArrowUpRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}

