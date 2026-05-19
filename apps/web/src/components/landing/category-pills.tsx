'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

/* CategoryPills — Wix-Tripo white-on-light category cards.

   Four white rounded cards on the light page canvas: image on top, small
   label + chunky title + browse arrow below. Cards lift with a soft blue
   shadow on hover. Replaces the previous edge-to-edge dark Rockstar
   tiles. */

interface Category {
  href: string;
  art: string;
  tag: string;
  title: string;
  count: string;
}

const CATS: Category[] = [
  {
    href: '/games/pokemon-go/accounts',
    art: '/categories/accounts.svg',
    tag: 'Marketplace',
    title: 'Trainer accounts',
    count: '240+ listings',
  },
  {
    href: '/games/pokemon-go/top-ups',
    art: '/categories/top-ups.svg',
    tag: 'Marketplace',
    title: 'PokéCoin top-ups',
    count: '60+ listings',
  },
  {
    href: '/games/pokemon-go/items',
    art: '/categories/items.svg',
    tag: 'Marketplace',
    title: 'Items & bundles',
    count: '180+ listings',
  },
  {
    href: '/games/pokemon-go/boosting',
    art: '/categories/boosting.svg',
    tag: 'Service',
    title: 'Boosting & raids',
    count: '7 services',
  },
];

const EASE = [0.22, 1, 0.36, 1] as const;

export function CategoryPills() {
  const reduce = useReducedMotion();

  return (
    <section
      aria-label="Shop categories"
      className="relative px-4 sm:px-6 lg:px-8 py-12 md:py-16"
    >
      <div className="mx-auto max-w-[1400px]">
        <div className="flex items-end justify-between gap-6 flex-wrap mb-8 md:mb-10">
          <div>
            <div className="text-[12px] font-medium text-[hsl(var(--primary))] mb-3">
              Shop by category
            </div>
            <h2 className="font-display font-extrabold text-[hsl(var(--foreground))] leading-[0.92] tracking-[-0.025em] text-[clamp(2rem,5vw,3.5rem)]">
              Pick your way in.
            </h2>
          </div>
          <Link
            href="/games/pokemon-go"
            className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))] transition-colors"
          >
            All Pokémon GO
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {CATS.map((c, i) => (
            <motion.div
              key={c.href}
              initial={reduce ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{
                duration: 0.55,
                delay: 0.06 * i,
                ease: EASE,
              }}
            >
              <CategoryTile cat={c} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CategoryTile({ cat }: { cat: Category }) {
  return (
    <Link
      href={cat.href}
      className="group block rounded-[1.25rem] overflow-hidden bg-[hsl(var(--surface))] border border-[hsl(var(--border))] shadow-[0_1px_2px_hsl(222_24%_8%/0.04),0_8px_24px_hsl(222_24%_8%/0.05)] transition-all duration-ui ease-apple hover:-translate-y-1 hover:shadow-[0_4px_8px_hsl(222_24%_8%/0.06),0_16px_40px_hsl(222_100%_56%/0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))]"
    >
      <div className="relative aspect-[5/4] overflow-hidden bg-[hsl(var(--surface-elevated))]">
        <Image
          src={cat.art}
          alt={cat.title}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          loading="lazy"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        />
      </div>
      <div className="p-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))] mb-1.5">
          {cat.tag} · {cat.count}
        </div>
        <h3 className="font-display text-lg sm:text-xl font-bold tracking-tight text-[hsl(var(--foreground))] mb-3">
          {cat.title}
        </h3>
        <div className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[hsl(var(--foreground)/0.7)] group-hover:text-[hsl(var(--primary))] transition-colors">
          Browse now
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      </div>
    </Link>
  );
}
