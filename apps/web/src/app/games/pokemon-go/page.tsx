'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Users,
  Coins,
  Package,
  Trophy,
  ArrowRight,
  ShieldCheck,
  Zap,
  Sparkles,
} from 'lucide-react';
import { Header } from '@/components/header';
import { LandingFooter } from '@/components/landing/landing-footer';
import { ListingCard, ListingCardSkeleton } from '@/components/listings/listing-card';
import { BrowseTrustStrip } from '@/components/listings/browse-trust-strip';
import { CustomRequestCTA } from '@/components/custom-request/custom-request-cta';
import { FloatingCTA } from '@/components/custom-request/floating-cta';
import { useListings, type TabType } from '@/hooks/use-listings';

/* /games/pokemon-go — the Pokémon GO hub.
 *
 * Replaces the prior redirect-to-/accounts behavior. Buyers arriving
 * at the canonical game URL now land on a hub that surfaces all four
 * sub-categories (Accounts, Top-ups, Items, Boosting) plus a top-picks
 * rail and trust strip. Reduces dead hops, lets buyers cross-shop, and
 * gives the URL a sharable identity. */

interface Category {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  tagline: string;
  hint: string;
  tabType: TabType | null;
}

const CATEGORIES: Category[] = [
  {
    id: 'accounts',
    label: 'Trainer accounts',
    href: '/games/pokemon-go/accounts',
    icon: Users,
    tagline: 'Lvl 30–50 trainers · shinies · hundos · legendaries',
    hint: 'From $19',
    tabType: 'ACCOUNTS',
  },
  {
    id: 'top-ups',
    label: 'PokéCoin top-ups',
    href: '/games/pokemon-go/top-ups',
    icon: Coins,
    tagline: '5K · 14K · 25K coin packs · auto-delivered',
    hint: 'From $4',
    tabType: 'TOP_UPS',
  },
  {
    id: 'items',
    label: 'Items & bundles',
    href: '/games/pokemon-go/items',
    icon: Package,
    tagline: 'Raid passes · lures · lucky packs · event bundles',
    hint: 'From $2',
    tabType: 'ITEMS',
  },
  {
    id: 'boosting',
    label: 'Boosting & raids',
    href: '/games/pokemon-go/boosting',
    icon: Trophy,
    tagline: 'XP grind · stardust · raid wins · legendary catches',
    hint: 'From $9',
    tabType: null,
  },
];

export default function PokemonGoHubPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        <GameHero />
        <CategoryGrid />
        <TopPicksSection />
        <BrowseTrustStripWrap />
        <CustomRequestBanner />
        <FloatingCTA gameSlug="pokemon-go" tabType="ACCOUNTS" />
      </main>

      <LandingFooter />
    </div>
  );
}

function GameHero() {
  const reduce = useReducedMotion();
  return (
    <section className="relative overflow-hidden border-b border-border/40">
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 60% 50% at 50% 0%, hsl(var(--primary) / 0.14), transparent 65%)',
        }}
      />
      <div className="container py-4 md:py-6">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="inline-flex items-center gap-1.5 mb-2 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary font-bold">
              Pokémon GO · Live now
            </span>
          </div>

          <h1 className="font-display text-[clamp(1.5rem,3vw,2.25rem)] font-extrabold tracking-tight leading-[1] text-foreground">
            Buy, top-up, gear up · <span className="text-primary">Pokémon GO</span>
          </h1>

          <p className="mt-1.5 text-[12.5px] md:text-[13px] text-muted-foreground max-w-2xl leading-relaxed">
            Verified trainers, PokéCoin packs, items, and boosting — escrow on every order.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11.5px]">
            <span className="inline-flex items-center gap-1.5 text-foreground/85">
              <ShieldCheck className="h-3.5 w-3.5 text-success" strokeWidth={2.5} />
              <span className="font-semibold">Escrow on every order</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-foreground/85">
              <Zap className="h-3.5 w-3.5 text-primary" strokeWidth={2.5} />
              <span className="font-semibold">Instant top-up delivery</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-foreground/85">
              <Sparkles className="h-3.5 w-3.5 text-accent" strokeWidth={2.5} />
              <span className="font-semibold">Verified sellers only</span>
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function CategoryGrid() {
  return (
    <section className="container py-6 md:py-8">
      <div className="flex items-end justify-between gap-6 flex-wrap mb-8">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary mb-2">
            Pick your category
          </div>
          <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight">
            Where do you want to start?
          </h2>
        </div>
        <p className="text-sm text-muted-foreground max-w-sm">
          Each path lands you in a filtered grid you can buy from in two taps.
        </p>
      </div>

      {/* Plain Link grid — no motion wrapper. Earlier whileInView
          animation could leave a card stuck at opacity:0 if the
          intersection observer didn't fire, which made cards look
          dead on click. Static = guaranteed clickable. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <Link
              key={cat.id}
              href={cat.href}
              className="group block h-full rounded-2xl border border-border/50 bg-surface/60 backdrop-blur p-6 transition-all duration-200 ease-out hover:border-primary/50 hover:-translate-y-1 hover:shadow-[0_24px_60px_-20px_hsl(var(--primary-glow)/0.5)]"
            >
              <div className="flex items-start justify-between mb-5">
                <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 grid place-items-center text-primary group-hover:bg-primary/15 transition-colors">
                  <Icon className="h-6 w-6" />
                </div>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  {cat.hint}
                </span>
              </div>
              <h3 className="font-display text-lg font-semibold leading-tight mb-2 group-hover:text-primary transition-colors">
                {cat.label}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-5 min-h-[2.5rem]">
                {cat.tagline}
              </p>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                Browse
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function TopPicksSection() {
  return (
    <section className="border-t border-border/40 bg-surface-elevated/20">
      <div className="container py-12 md:py-16 space-y-12">
        <TopPicksRow
          tabType="ACCOUNTS"
          title="Top trainer accounts"
          eyebrow="Most-bought · Accounts"
          href="/games/pokemon-go/accounts"
        />
        <TopPicksRow
          tabType="TOP_UPS"
          title="Hot PokéCoin packs"
          eyebrow="Auto-delivered · Top-ups"
          href="/games/pokemon-go/top-ups"
        />
        <TopPicksRow
          tabType="ITEMS"
          title="Featured items & bundles"
          eyebrow="Pick-of-the-day · Items"
          href="/games/pokemon-go/items"
        />
      </div>
    </section>
  );
}

function TopPicksRow({
  tabType,
  title,
  eyebrow,
  href,
}: {
  tabType: 'ACCOUNTS' | 'TOP_UPS' | 'ITEMS';
  title: string;
  eyebrow: string;
  href: string;
}) {
  const { data, isLoading } = useListings({
    gameSlug: 'pokemon-go',
    tabType,
    sort: 'popular',
    limit: 6,
  });

  if (!isLoading && (!data || data.data.length === 0)) return null;

  return (
    <div>
      <div className="flex items-end justify-between gap-4 flex-wrap mb-5">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary mb-1.5">
            {eyebrow}
          </div>
          <h3 className="font-display text-xl md:text-2xl font-bold tracking-tight">
            {title}
          </h3>
        </div>
        <Link
          href={href}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          See all
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {data!.data.slice(0, 6).map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}

function BrowseTrustStripWrap() {
  return (
    <section className="container py-10">
      <BrowseTrustStrip />
    </section>
  );
}

function CustomRequestBanner() {
  return (
    <section className="container pb-20">
      <CustomRequestCTA
        gameSlug="pokemon-go"
        tabType="ACCOUNTS"
        variant="banner"
      />
    </section>
  );
}
