'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Star,
  BadgeCheck,
  Clock,
  Flame,
  Heart,
  User,
  Coins,
  Package,
  Sword,
} from 'lucide-react';
import { useWishlist } from '@/hooks/use-wishlist';
import { GetxShieldBadge } from '@/components/shield/getx-shield-badge';
import { RefundSlaChip } from '@/components/shield/refund-sla-chip';
import { formatMoney } from '@/lib/currency';

/* ProductRail — reusable horizontal product carousel.

   Card anatomy:
   - Top row: game tag + category chip
   - Image area (real image OR themed placeholder if image missing/generic)
   - Optional urgency chip overlay (Ends-in / Low stock / Sold recent)
   - Title (line-clamped)
   - Seller mini-bar (avatar initials + handle + rating + verified tick)
   - Price footer + escrow microline + Buy arrow */

export interface RailProductSeller {
  handle: string;
  rating: number;
  orders: number;
  verified?: boolean;
}

export type RailProductCategory =
  | 'Accounts'
  | 'Top-ups'
  | 'Items'
  | 'Boosting'
  | string;

export interface RailProduct {
  href: string;
  title: string;
  image: string;
  category: RailProductCategory;
  gameTag: string;
  gameAccent: string;
  price: number;
  was?: number;
  rating?: number;
  badge?: string;
  /** Seller info — shows mini-bar on the card */
  seller?: RailProductSeller;
  /** Urgency signals — render the strongest one available */
  endsIn?: string;
  stockLeft?: number;
  soldRecent?: number;
}

export interface ProductRailProps {
  title: string;
  subtitle?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  products: RailProduct[];
}

const EASE = [0.22, 1, 0.36, 1] as const;

/* The generic SVG path our mock data points to. When a card carries
   that exact image we treat it as "no image" and render a themed
   placeholder instead — keeps the rails from looking like 24 copies of
   the same picture while the real CDN images get sourced. */
const GENERIC_IMAGE_PATHS = new Set<string>([
  '/games/pokemon-go/hero.svg',
  '/categories/accounts.svg',
  '/categories/top-ups.svg',
  '/categories/items.svg',
  '/categories/boosting.svg',
]);

const CATEGORY_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  Accounts: User,
  'Top-ups': Coins,
  Items: Package,
  Boosting: Sword,
};

/* Deterministic gradient angle per slug — keeps placeholders from looking
   identical even when several cards share the same category + accent. */
function angleFromSlug(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return h % 360;
}

export function ProductRail({
  title,
  subtitle,
  viewAllHref,
  viewAllLabel = 'View all',
  products,
}: ProductRailProps) {
  const reduce = useReducedMotion();
  const railRef = React.useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    const el = railRef.current;
    if (!el) return;
    const step = el.clientWidth * 0.85;
    el.scrollBy({ left: dir === 'left' ? -step : step, behavior: 'smooth' });
  };

  return (
    <section
      aria-label={title}
      className="relative bg-[#0F0C26] text-white px-4 sm:px-6 lg:px-8 py-12 md:py-16"
    >
      <div className="mx-auto max-w-[1280px]">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
          className="flex items-end justify-between gap-4 mb-5 md:mb-7"
        >
          <div className="min-w-0">
            <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight truncate">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-1 text-[12px] sm:text-[13px] text-white/55 truncate">
                {subtitle}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {viewAllHref ? (
              <Link
                href={viewAllHref}
                className="hidden sm:inline-flex items-center gap-1 h-10 px-4 rounded-full text-[12px] font-semibold text-white/85 bg-white/5 ring-1 ring-white/10 hover:bg-white/10 transition-colors"
              >
                {viewAllLabel}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => scroll('left')}
              aria-label="Scroll left"
              className="inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10 hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
            <button
              type="button"
              onClick={() => scroll('right')}
              aria-label="Scroll right"
              className="inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full ring-1 ring-[hsl(var(--primary))]/40 text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/10 transition-colors"
            >
              <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          </div>
        </motion.div>

        <div
          ref={railRef}
          className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 -mx-4 sm:-mx-0 px-4 sm:px-0 snap-x snap-mandatory"
          style={{ scrollbarWidth: 'thin' }}
        >
          {products.map((p, i) => (
            <motion.div
              key={p.href + i}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.45, delay: i * 0.04, ease: EASE }}
              className="snap-start shrink-0 w-[240px] sm:w-[260px] md:w-[280px]"
            >
              <ProductCard product={p} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductCard({ product }: { product: RailProduct }) {
  const discount = product.was
    ? Math.round(((product.was - product.price) / product.was) * 100)
    : 0;

  const useThemedPlaceholder = GENERIC_IMAGE_PATHS.has(product.image);

  const { isSaved, toggleSummary } = useWishlist();
  const saved = isSaved(product.href);

  const onWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleSummary({
      id: product.href,
      slug: product.href.split('/').pop() ?? null,
      title: product.title,
      price: product.price,
      cover: product.image,
      gameSlug: 'pokemon-go',
      tabType: product.category.toUpperCase().replace('-', '_'),
    });
  };

  // Pick the strongest urgency signal available
  const urgency = (() => {
    if (product.endsIn) {
      return {
        icon: Clock,
        label: `Ends in ${product.endsIn}`,
        bg: 'bg-[hsl(var(--primary))]',
        fg: 'text-[#14102B]',
      };
    }
    if (product.stockLeft != null && product.stockLeft <= 5) {
      return {
        icon: Flame,
        label: `Only ${product.stockLeft} left`,
        bg: 'bg-[#FF1B1B]',
        fg: 'text-white',
      };
    }
    if (product.soldRecent != null && product.soldRecent >= 3) {
      return {
        icon: Flame,
        label: `${product.soldRecent} sold today`,
        bg: 'bg-[#10B981]',
        fg: 'text-white',
      };
    }
    return null;
  })();

  return (
    <Link
      href={product.href}
      className="group block h-full rounded-2xl overflow-hidden bg-white/[0.035] ring-1 ring-white/10 hover:ring-white/30 hover:-translate-y-1 transition-all duration-300"
    >
      {/* Top — game tag + category */}
      <div className="flex items-center justify-between gap-2 px-3 pt-3">
        <span
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider"
          style={{
            backgroundColor: `${product.gameAccent}26`,
            color: product.gameAccent,
            boxShadow: `inset 0 0 0 1px ${product.gameAccent}55`,
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: product.gameAccent }}
          />
          {product.gameTag}
        </span>
        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-white/8 ring-1 ring-white/12 text-[10px] font-semibold uppercase tracking-wider text-white/70">
          {product.category}
        </span>
      </div>

      {/* Image / placeholder */}
      <div className="relative mt-3 mx-3 aspect-[4/3] rounded-xl overflow-hidden bg-black/40">
        {useThemedPlaceholder ? (
          <ThemedPlaceholder
            slug={product.href}
            accent={product.gameAccent}
            category={product.category}
          />
        ) : (
          <Image
            src={product.image}
            alt={product.title}
            fill
            sizes="280px"
            loading="lazy"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
          />
        )}

        {/* Top-left discount */}
        {discount > 0 ? (
          <span className="absolute top-2 left-2 inline-flex items-center px-2 py-0.5 rounded-md bg-[#10B981] text-white text-[9.5px] font-bold uppercase tracking-wider">
            −{discount}%
          </span>
        ) : null}

        {/* Top-right wishlist */}
        <button
          type="button"
          onClick={onWishlist}
          aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
          aria-pressed={saved}
          className={`absolute top-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md transition-all ${
            saved
              ? 'bg-[#FF3B5C] text-white shadow-[0_4px_12px_rgba(255,59,92,0.45)] scale-105'
              : 'bg-black/45 text-white hover:bg-black/65 hover:scale-105'
          }`}
        >
          <Heart
            className={`h-4 w-4 transition-transform ${saved ? 'fill-current' : ''}`}
          />
        </button>

        {/* Bottom-right curator badge */}
        {product.badge ? (
          <span className="absolute bottom-2 right-2 inline-flex items-center px-2 py-0.5 rounded-md bg-[hsl(var(--primary))] text-[#14102B] text-[9.5px] font-bold uppercase tracking-wider">
            {product.badge}
          </span>
        ) : null}

        {/* Bottom-left urgency chip OR refund SLA fallback when no urgency */}
        {urgency ? (
          <span
            className={`absolute bottom-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md ${urgency.bg} ${urgency.fg} text-[9.5px] font-bold uppercase tracking-wider`}
          >
            <urgency.icon className="h-2.5 w-2.5" />
            {urgency.label}
          </span>
        ) : (
          <span className="absolute bottom-2 left-2">
            <RefundSlaChip variant="compact" category={product.category} />
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-3 pt-3 pb-4">
        <h3 className="text-[13.5px] sm:text-[14px] font-bold text-white leading-snug line-clamp-2 mb-2 min-h-[2.5em]">
          {product.title}
        </h3>

        {/* Seller mini-bar */}
        {product.seller ? <SellerBar seller={product.seller} /> : null}

        {/* Price + rating row */}
        <div className={`flex items-end justify-between gap-2 ${product.seller ? 'mt-2.5' : ''}`}>
          <div className="min-w-0">
            <div className="font-display text-lg sm:text-xl font-extrabold tabular-nums leading-none">
              {formatMoney(product.price, 'USD')}
            </div>
            {product.was ? (
              <div className="text-[11px] text-white/45 line-through tabular-nums mt-0.5">
                {formatMoney(product.was, 'USD')}
              </div>
            ) : null}
          </div>
          {product.rating ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-white/70 shrink-0">
              <Star className="h-3 w-3 fill-[hsl(var(--primary))] text-[hsl(var(--primary))]" />
              {product.rating}
            </span>
          ) : null}
        </div>

        {/* Trust footer */}
        <div className="mt-3 pt-3 border-t border-white/8 flex items-center justify-between gap-2 text-[10.5px]">
          <GetxShieldBadge variant="compact" showTooltip={false} />
          <span className="inline-flex items-center gap-1 font-semibold text-[hsl(var(--primary))] transition-transform group-hover:translate-x-0.5">
            Buy
            <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}

/* --------------------------- atoms --------------------------- */

function SellerBar({ seller }: { seller: RailProductSeller }) {
  const initials = seller.handle.replace('@', '').slice(0, 2).toUpperCase();
  return (
    <div className="flex items-center gap-2 text-[11px] min-w-0">
      <span
        className="h-5 w-5 rounded-full grid place-items-center text-white text-[9px] font-bold shrink-0"
        style={{
          background:
            'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary-hover)) 100%)',
        }}
        aria-hidden
      >
        {initials}
      </span>
      <span className="text-white/85 font-medium truncate flex-1">
        {seller.handle}
      </span>
      {seller.verified ? (
        <BadgeCheck className="h-3 w-3 text-[#3B82F6] shrink-0" aria-label="Verified seller" />
      ) : null}
      <span className="inline-flex items-center gap-0.5 text-white/55 tabular-nums shrink-0">
        <Star className="h-2.5 w-2.5 fill-[hsl(var(--primary))] text-[hsl(var(--primary))]" />
        {seller.rating.toFixed(2)}
        <span className="text-white/35">·</span>
        {seller.orders}
      </span>
    </div>
  );
}

function ThemedPlaceholder({
  slug,
  accent,
  category,
}: {
  slug: string;
  accent: string;
  category: string;
}) {
  const angle = angleFromSlug(slug);
  const Icon = CATEGORY_ICON[category] ?? Package;
  return (
    <div
      className="absolute inset-0"
      style={{
        background: `linear-gradient(${angle}deg, ${accent} 0%, ${accent}99 35%, ${accent}33 100%)`,
      }}
    >
      {/* Soft Pokéball-like ring backdrop */}
      <svg
        viewBox="0 0 200 200"
        className="absolute inset-0 w-full h-full opacity-[0.18]"
        aria-hidden
      >
        <g fill="none" stroke="#FFFFFF" strokeWidth="2.5">
          <circle cx="100" cy="100" r="74" />
          <path d="M26 100 H174" />
          <circle cx="100" cy="100" r="14" />
        </g>
      </svg>
      {/* Category glyph */}
      <div className="absolute inset-0 grid place-items-center">
        <Icon className="h-12 w-12 text-white/80 drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]" />
      </div>
    </div>
  );
}
