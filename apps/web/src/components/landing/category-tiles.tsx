'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

/* CategoryTiles — 2x2 edge-to-edge category posters.

   Backed by real SVG key-art files in /public/categories. Replacing them
   later is one file swap — no code change needed. */

interface Category {
  href: string;
  art: string;
  tag: string;
  title: string;
  blurb: string;
  cta: string;
}

const CATEGORIES: Category[] = [
  {
    href: '/games/pokemon-go/accounts',
    art: '/categories/accounts.svg',
    tag: 'Marketplace · Accounts',
    title: 'Trainer accounts',
    blurb: 'Lvl 30 → 50 verified trainers. Shinies, hundos, legendaries.',
    cta: 'Browse accounts',
  },
  {
    href: '/games/pokemon-go/top-ups',
    art: '/categories/top-ups.svg',
    tag: 'Marketplace · Top-ups',
    title: 'PokéCoin top-ups',
    blurb: '5K · 14K · 25K coin packs · UPI checkout · auto-delivered.',
    cta: 'Browse top-ups',
  },
  {
    href: '/games/pokemon-go/items',
    art: '/categories/items.svg',
    tag: 'Marketplace · Items',
    title: 'Items & bundles',
    blurb: 'Raid passes, lures, lucky packs, event bundles.',
    cta: 'Browse items',
  },
  {
    href: '/games/pokemon-go/boosting',
    art: '/categories/boosting.svg',
    tag: 'Service · Boosting',
    title: 'Boosting & raids',
    blurb: 'XP boosts, raid wins, stardust grinds, legendary catches.',
    cta: 'Browse boosters',
  },
];

export function CategoryTiles() {
  const reduce = useReducedMotion();

  return (
    <section
      aria-label="Shop by category"
      className="relative bg-black border-t border-border/60 py-20 md:py-28"
    >
      <div className="container">
        <div className="flex items-end justify-between mb-10 md:mb-14 gap-6 flex-wrap">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary mb-3">
              Shop by category
            </div>
            <h2 className="font-display font-bold uppercase leading-[0.9] tracking-[-0.01em] text-[clamp(2.5rem,6vw,5.5rem)] text-white">
              Pick what you need.
            </h2>
          </div>
          <p className="max-w-md text-sm text-white/75">
            Four categories. Each one escrow-protected, each one delivered fast.
            Start anywhere — the order page handles the rest.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          {CATEGORIES.map((cat, i) => (
            <motion.div
              key={cat.href}
              initial={reduce ? false : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{
                duration: 0.55,
                delay: 0.06 * i,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <CategoryTile category={cat} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CategoryTile({ category }: { category: Category }) {
  return (
    <Link
      href={category.href}
      className="group relative block overflow-hidden bg-black border border-border/60 hover:border-primary transition-colors duration-ui ease-apple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-black"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-[hsl(0_0%_5%)]">
        <Image
          src={category.art}
          alt={category.title}
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          loading="lazy"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        />
        {/* Bottom gradient for text legibility */}
        <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black via-black/80 to-transparent" />

        {/* Yellow corner accent — reveals on hover */}
        <span
          aria-hidden
          className="absolute top-0 left-0 h-10 w-0 bg-primary transition-all duration-300 ease-out group-hover:w-10"
        />

        {/* Overlay content */}
        <div className="absolute inset-0 flex flex-col justify-end p-5 md:p-8">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary mb-2">
            {category.tag}
          </div>
          <h3 className="font-display font-bold uppercase leading-[0.92] tracking-[-0.01em] text-[clamp(2rem,4vw,3.5rem)] text-white">
            {category.title}
          </h3>
          <p className="mt-2 max-w-md text-sm text-white/70">{category.blurb}</p>

          <div className="mt-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-white/70 group-hover:text-primary transition-colors">
            {category.cta}
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </div>
      </div>
    </Link>
  );
}
