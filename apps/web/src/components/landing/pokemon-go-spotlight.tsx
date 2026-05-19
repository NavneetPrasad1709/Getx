'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from '@getx/ui';
import { ArrowRight, Coins, ShoppingBag, Trophy, Crown, Sparkles, Flame } from 'lucide-react';
import { Button, Badge } from '@getx/ui';
import { useGames } from '@/hooks/use-games';

/* Pokemon GO Spotlight — the launch game gets its own cinematic frame. Three
   trophy "trainer profiles" sit on the right, three quick-jump category cards
   on the left. Reads as a brochure page for one game rather than a generic
   catalog tile. */

const TRAINERS = [
  {
    tag: 'Lvl 50 · Valor',
    title: 'The Veteran Vault',
    desc: '312 Shinies · 18 Legendaries · 4 Hundo Dragons.',
    price: '$531',
    badge: 'Featured' as const,
  },
  {
    tag: 'Lvl 47 · Mystic',
    title: 'Hundo Hunter',
    desc: '6 Hundo accounts · Mewtwo + Rayquaza included.',
    price: '$440',
    badge: 'Hot' as const,
  },
  {
    tag: 'Lvl 50 · Instinct',
    title: 'Master Collector',
    desc: '8 Shadow Legendaries · 100% raid attendance.',
    price: '$361',
    badge: 'Verified' as const,
  },
];

const CATEGORIES = [
  {
    href: '/games/pokemon-go/accounts',
    label: 'Accounts',
    desc: 'Lvl 30 to 50, hand-picked',
    icon: Trophy,
    tone: 'text-primary bg-primary/15',
  },
  {
    href: '/games/pokemon-go/top-ups',
    label: 'PokéCoin top-ups',
    desc: '5K · 14K · 25K coin packs',
    icon: Coins,
    tone: 'text-accent bg-accent/15',
  },
  {
    href: '/games/pokemon-go/items',
    label: 'Items & bundles',
    desc: 'Raid passes, lures, lucky packs',
    icon: ShoppingBag,
    tone: 'text-hot bg-hot/15',
  },
];

export function PokemonGoSpotlight() {
  const reduce = useReducedMotion();
  const { data: games } = useGames();
  const pogo = games?.find((g) => g.slug === 'pokemon-go');
  const listingCount = pogo?.totalListings ?? 240;
  const sellerCount = pogo?.totalSellers ?? 86;

  return (
    <section
      aria-label="Pokemon GO spotlight"
      className="relative isolate overflow-hidden border-t border-border/40 py-24 md:py-32"
    >
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-background" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_30%,hsl(var(--primary)/0.18),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_70%,hsl(var(--accent)/0.10),transparent_55%)]" />
        <div className="absolute inset-0 hero-particles opacity-40" />
      </div>

      <div className="container relative">
        <div className="grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-16 items-center">
          {/* Left — headline + categories */}
          <div>
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="mb-5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/30 bg-primary/[0.08] text-[10px] md:text-[11px] font-semibold tracking-[0.22em] uppercase">
                <Sparkles className="h-3 w-3 text-primary" />
                <span className="text-primary">Live now · Pokemon GO</span>
              </div>

              <h2 className="font-display font-bold leading-[0.9] tracking-[-0.04em] text-[clamp(2.5rem,7vw,6rem)] mb-6">
                Trade like a{' '}
                <span className="gradient-text-cyan bg-[length:200%_100%] animate-shimmer">Champion</span>.
              </h2>

              <p className="text-base md:text-lg text-foreground/75 leading-relaxed max-w-xl mb-8">
                Pokémon GO is GetX&apos;s launch game — picked because Indian trainers got the worst deal on every other marketplace. Now they get the best.
              </p>

              <div className="flex flex-wrap gap-3 mb-10">
                <span className="font-mono text-sm text-foreground/85">
                  <span className="font-bold text-primary tabular-nums">{listingCount}+</span>{' '}
                  <span className="text-muted-foreground">listings</span>
                </span>
                <span aria-hidden className="text-border">·</span>
                <span className="font-mono text-sm text-foreground/85">
                  <span className="font-bold text-success tabular-nums">{sellerCount}+</span>{' '}
                  <span className="text-muted-foreground">verified sellers</span>
                </span>
                <span aria-hidden className="text-border">·</span>
                <span className="font-mono text-sm text-foreground/85">
                  <span className="font-bold text-accent">5 min</span>{' '}
                  <span className="text-muted-foreground">median delivery</span>
                </span>
              </div>

              <div className="space-y-3 mb-8">
                {CATEGORIES.map((c, i) => (
                  <motion.div
                    key={c.href}
                    initial={reduce ? false : { opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.5, delay: 0.1 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Link
                      href={c.href}
                      className="group flex items-center gap-4 rounded-2xl border border-border/60 bg-surface/60 backdrop-blur-xl p-4 transition-all duration-ui ease-apple hover:border-primary/40 hover:bg-surface hover:-translate-y-0.5"
                    >
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${c.tone}`}>
                        <c.icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-display text-base font-semibold tracking-tight group-hover:text-primary transition-colors">
                          {c.label}
                        </div>
                        <div className="text-xs text-muted-foreground">{c.desc}</div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </Link>
                  </motion.div>
                ))}
              </div>

              <Link href="/games/pokemon-go">
                <Button variant="default" size="xl" className="rounded-full">
                  Enter the marketplace
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </motion.div>
          </div>

          {/* Right — trainer stack */}
          <div className="relative">
            <div className="space-y-4">
              {TRAINERS.map((t, i) => (
                <motion.div
                  key={t.title}
                  initial={reduce ? false : { opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.55, delay: 0.15 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  className={`surface-cinematic rounded-3xl p-5 md:p-6 flex items-center gap-4 ${
                    i === 0 ? 'lg:scale-105 lg:z-10' : 'lg:scale-[0.96] lg:opacity-90'
                  }`}
                >
                  {/* Trainer "art" — gradient tile (real artwork can swap in via prop later) */}
                  <div className="relative h-20 w-20 md:h-24 md:w-24 shrink-0 rounded-2xl overflow-hidden bg-gradient-to-br from-primary/30 via-primary/10 to-accent/20 border border-border/50">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Crown className="h-8 w-8 text-foreground/40" />
                    </div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,hsl(var(--primary-glow)/0.35),transparent_55%)]" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {t.badge === 'Featured' ? (
                        <Badge variant="premium" size="sm">Featured</Badge>
                      ) : t.badge === 'Hot' ? (
                        <Badge variant="hot" size="sm"><Flame className="h-3 w-3" /> Hot</Badge>
                      ) : (
                        <Badge variant="verified" size="sm">Verified</Badge>
                      )}
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{t.tag}</span>
                    </div>
                    <div className="font-display text-lg md:text-xl font-bold tracking-tight mb-1">
                      {t.title}
                    </div>
                    <div className="text-xs text-foreground/65 leading-snug">{t.desc}</div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono text-lg md:text-xl font-bold text-primary tabular-nums">
                      {t.price}
                    </div>
                    <div className="text-[10px] text-muted-foreground">/ account</div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Floating glow card behind the stack */}
            <div aria-hidden className="hidden lg:block absolute -inset-4 -z-10 rounded-[36px] bg-gradient-to-br from-primary/10 via-transparent to-accent/10 blur-2xl" />
          </div>
        </div>
      </div>
    </section>
  );
}
