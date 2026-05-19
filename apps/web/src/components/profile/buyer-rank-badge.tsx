'use client';

import * as React from 'react';
import Link from 'next/link';
import { Crown, Gem, Medal, Trophy, ArrowRight } from 'lucide-react';
import { motion, useReducedMotion } from '@getx/ui';

/* BuyerRankBadge — gamification.

   Buyers earn a rank based on the number of completed orders. Ranks are
   purely cosmetic for now (no fee changes), but the visible progress bar +
   next-rank target work as a retention loop on its own. Pass `totalOrders`
   from the auth/profile hook and the component handles the rest. */

export type BuyerRank = 'Rookie' | 'Bronze' | 'Silver' | 'Gold' | 'Diamond';

interface RankSpec {
  name: BuyerRank;
  min: number;
  icon: React.ComponentType<{ className?: string }>;
  /** Tailwind classes for the chip surface. */
  surface: string;
  /** Tailwind classes for the icon tone. */
  tone: string;
  /** Marketing copy shown when this rank is current. */
  perk: string;
}

const RANKS: RankSpec[] = [
  {
    name: 'Rookie',
    min: 0,
    icon: Medal,
    surface: 'bg-muted/15 border-border text-foreground/80',
    tone: 'text-muted-foreground',
    perk: 'Welcome aboard. Make your first trade to unlock Bronze.',
  },
  {
    name: 'Bronze',
    min: 1,
    icon: Medal,
    surface: 'bg-[hsl(28_60%_45%/0.12)] border-[hsl(28_60%_45%/0.4)]',
    tone: 'text-[hsl(28_70%_60%)]',
    perk: 'Early access to weekly featured drops.',
  },
  {
    name: 'Silver',
    min: 5,
    icon: Trophy,
    surface: 'bg-[hsl(0_0%_75%/0.10)] border-[hsl(0_0%_75%/0.40)]',
    tone: 'text-[hsl(0_0%_85%)]',
    perk: '24-hour head start on flash deals.',
  },
  {
    name: 'Gold',
    min: 15,
    icon: Crown,
    surface: 'bg-accent/15 border-accent/40',
    tone: 'text-accent',
    perk: 'Free priority dispute escalation. Verified ribbon on reviews.',
  },
  {
    name: 'Diamond',
    min: 40,
    icon: Gem,
    surface: 'bg-primary/15 border-primary/40',
    tone: 'text-primary',
    perk: 'Concierge support. Exclusive whale-tier drops. Zero buyer fees.',
  },
];

export function rankForOrders(orders: number): { current: RankSpec; next: RankSpec | null } {
  const sorted = [...RANKS].sort((a, b) => a.min - b.min);
  let current = sorted[0];
  for (const r of sorted) if (orders >= r.min) current = r;
  const next = sorted.find((r) => r.min > orders) ?? null;
  return { current, next };
}

interface Props {
  totalOrders: number;
  variant?: 'compact' | 'card';
  showProgress?: boolean;
  className?: string;
}

export function BuyerRankBadge({ totalOrders, variant = 'compact', showProgress = true, className = '' }: Props) {
  const reduce = useReducedMotion();
  const { current, next } = rankForOrders(totalOrders);
  const Icon = current.icon;

  if (variant === 'compact') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-mono text-[10px] uppercase tracking-wider ${current.surface} ${className}`}
        title={`${current.name} buyer · ${totalOrders} order${totalOrders === 1 ? '' : 's'}`}
      >
        <Icon className={`h-3 w-3 ${current.tone}`} />
        <span className="font-semibold">{current.name}</span>
      </span>
    );
  }

  const prev = RANKS[Math.max(0, RANKS.findIndex((r) => r.name === current.name))];
  const ceiling = next ? next.min : current.min + Math.max(1, current.min);
  const floor = prev.min;
  const pct = next ? Math.max(0, Math.min(1, (totalOrders - floor) / (ceiling - floor))) : 1;
  const needed = next ? Math.max(0, next.min - totalOrders) : 0;

  return (
    <section className={`surface-cinematic rounded-3xl p-6 md:p-7 ${className}`}>
      <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
        <div className="flex items-center gap-4">
          <motion.div
            initial={reduce ? false : { scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className={`flex h-14 w-14 items-center justify-center rounded-2xl border ${current.surface}`}
          >
            <Icon className={`h-7 w-7 ${current.tone}`} />
          </motion.div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">
              Buyer rank
            </div>
            <div className={`font-display text-2xl font-bold tracking-tight ${current.tone}`}>
              {current.name}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 tabular-nums">
              {totalOrders} completed order{totalOrders === 1 ? '' : 's'}
            </div>
          </div>
        </div>
        {next ? (
          <div className="text-right">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">
              Next
            </div>
            <div className="font-display text-base font-semibold">{next.name}</div>
            <div className="text-xs text-muted-foreground tabular-nums">
              {needed} more order{needed === 1 ? '' : 's'}
            </div>
          </div>
        ) : (
          <div className="text-right">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary mb-1">
              Max rank
            </div>
            <div className="font-display text-base font-semibold text-primary">Diamond</div>
          </div>
        )}
      </div>

      {showProgress ? (
        <div className="mb-4">
          <div className="h-2 rounded-full bg-muted/20 overflow-hidden">
            <motion.div
              initial={reduce ? false : { width: 0 }}
              animate={{ width: `${pct * 100}%` }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className={`h-full rounded-full ${
                current.name === 'Diamond'
                  ? 'bg-gradient-to-r from-primary to-primary-glow'
                  : current.name === 'Gold'
                    ? 'bg-gradient-to-r from-accent to-accent/70'
                    : current.name === 'Silver'
                      ? 'bg-gradient-to-r from-foreground/80 to-foreground/40'
                      : 'bg-gradient-to-r from-[hsl(28_70%_60%)] to-[hsl(28_60%_45%)]'
              }`}
            />
          </div>
        </div>
      ) : null}

      <p className="text-sm text-foreground/80 leading-relaxed mb-4">
        <span className="font-semibold">Perk: </span>
        {current.perk}
      </p>

      {next ? (
        <Link
          href="/games/pokemon-go/accounts"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          Trade to rank up
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      ) : null}
    </section>
  );
}
