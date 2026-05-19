'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Star, Trophy, Crown, ChevronUp } from 'lucide-react';
import { Header } from '@/components/header';
import { LandingFooter } from '@/components/landing/landing-footer';
import { RankBadgeRaw, type Rank } from '@/components/badges/rank-badge';
import { api } from '@/lib/api';

interface LeaderboardRow {
  position: number;
  username: string | null;
  name: string | null;
  avatar: string | null;
  rank: Rank;
  xp: number;
  totalSales: number;
  sellerRating: number;
  country: string;
}

function useLeaderboard() {
  return useQuery<LeaderboardRow[]>({
    queryKey: ['leaderboard', 'xp'],
    queryFn: async () => {
      const { data } = await api.get<LeaderboardRow[]>('/users/leaderboard');
      return data;
    },
    staleTime: 60_000,
  });
}

function handleFor(row: LeaderboardRow): string {
  return row.username ?? row.name ?? 'anon';
}

function podiumIcon(position: number) {
  if (position === 1) {
    return <Crown className="h-4 w-4 text-[hsl(45_95%_55%)]" />;
  }
  if (position === 2 || position === 3) {
    return <Trophy className="h-4 w-4 text-[hsl(45_85%_50%)]" />;
  }
  return null;
}

export default function LeaderboardPage() {
  const { data: rows = [], isLoading } = useLeaderboard();
  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <Header />

      <section className="relative isolate overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--primary)/0.18)] via-transparent to-[hsl(280_85%_60%/0.12)]" />
        <div className="relative mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="font-mono text-[11px] uppercase tracking-[0.32em] text-[hsl(var(--primary))] mb-3 inline-flex items-center gap-2">
            <ChevronUp className="h-3 w-3" />
            Trader leaderboard
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-extrabold tracking-tight max-w-3xl">
            Top 100 traders ranked by XP
          </h1>
          <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-2xl">
            Buyers + sellers earning their way up the ladder. XP comes from
            orders, reviews, and dispute wins — never bought, never decayed.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 text-[11.5px] text-muted-foreground">
            <span>Refresh every minute · public · open to all.</span>
            <Link
              href="/sellers/program"
              className="text-[hsl(var(--primary))] hover:underline font-semibold"
            >
              See the rank ladder →
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1100px] px-4 sm:px-6 lg:px-8 py-14 md:py-20">
        {/* Podium — top 3 */}
        {top3.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            {top3.map((row) => (
              <article
                key={row.position}
                className={[
                  'relative surface-cinematic rounded-3xl p-6 ring-1 ring-inset',
                  row.position === 1
                    ? 'ring-[hsl(45_95%_55%/0.45)] md:order-2 md:scale-[1.04]'
                    : row.position === 2
                      ? 'ring-[hsl(var(--muted-foreground)/0.3)] md:order-1'
                      : 'ring-[hsl(35_75%_50%/0.35)] md:order-3',
                ].join(' ')}
              >
                <div className="flex items-center justify-between mb-4">
                  <span
                    className={[
                      'inline-flex items-center justify-center h-10 w-10 rounded-2xl font-display text-lg font-extrabold',
                      row.position === 1
                        ? 'bg-[hsl(45_95%_55%/0.16)] text-[hsl(45_95%_55%)]'
                        : row.position === 2
                          ? 'bg-[hsl(var(--muted-foreground)/0.16)] text-[hsl(var(--muted-foreground))]'
                          : 'bg-[hsl(35_75%_50%/0.16)] text-[hsl(35_75%_50%)]',
                    ].join(' ')}
                  >
                    {row.position}
                  </span>
                  {podiumIcon(row.position)}
                </div>
                <Link
                  href={row.username ? `/users/${row.username}` : '#'}
                  className="block group"
                >
                  <div className="font-display text-xl font-bold truncate group-hover:text-[hsl(var(--primary))] transition-colors">
                    @{handleFor(row)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 inline-flex items-center gap-1.5">
                    <Star className="h-3 w-3 fill-[hsl(45_95%_55%)] text-[hsl(45_95%_55%)]" />
                    <span className="tabular-nums">
                      {row.sellerRating.toFixed(2)}
                    </span>
                    <span>·</span>
                    <span className="tabular-nums">{row.totalSales} sales</span>
                  </div>
                </Link>
                <div className="mt-4 flex items-center justify-between">
                  <RankBadgeRaw rank={row.rank} size="sm" />
                  <span className="font-display text-2xl font-extrabold tabular-nums text-[hsl(var(--primary))]">
                    {row.xp.toLocaleString('en-US')}
                    <span className="text-[11px] font-medium text-muted-foreground ml-1">XP</span>
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {/* Table — 4..100 */}
        <div className="surface-cinematic rounded-3xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border/40 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold">
              Rank 4 – 100
            </h2>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {rows.length} traders · sorted by XP
            </span>
          </div>
          {isLoading ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              Loading…
            </div>
          ) : rest.length === 0 && top3.length === 0 ? (
            <div className="px-6 py-14 text-center text-sm text-muted-foreground">
              The leaderboard is empty. Be the first — complete an order to
              earn XP.
            </div>
          ) : rest.length === 0 ? (
            <div className="px-6 py-10 text-center text-xs text-muted-foreground">
              Only 3 traders have earned XP so far. Check back as the rest
              climb in.
            </div>
          ) : (
            <ul className="divide-y divide-border/40">
              {rest.map((row) => (
                <li key={row.position}>
                  <Link
                    href={row.username ? `/users/${row.username}` : '#'}
                    className="flex items-center gap-3 px-6 py-3 hover:bg-[hsl(var(--surface-elevated))] transition-colors"
                  >
                    <span className="w-8 text-right font-mono text-[12px] text-muted-foreground tabular-nums">
                      {row.position}
                    </span>
                    <span
                      className="h-9 w-9 rounded-full grid place-items-center font-bold text-[12px] text-white shrink-0"
                      style={{
                        background:
                          'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary-hover)) 100%)',
                      }}
                    >
                      {handleFor(row).charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-[13.5px] truncate">
                        @{handleFor(row)}
                      </div>
                      <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
                        <Star className="h-2.5 w-2.5 fill-[hsl(45_95%_55%)] text-[hsl(45_95%_55%)]" />
                        <span className="tabular-nums">
                          {row.sellerRating.toFixed(2)}
                        </span>
                        <span>·</span>
                        <span className="tabular-nums">
                          {row.totalSales} sales
                        </span>
                        {row.country ? (
                          <>
                            <span>·</span>
                            <span className="uppercase">{row.country}</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                    <RankBadgeRaw rank={row.rank} size="xs" />
                    <span className="font-display text-[14px] font-extrabold tabular-nums text-[hsl(var(--primary))] min-w-[80px] text-right">
                      {row.xp.toLocaleString('en-US')}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="mt-6 text-[11px] text-muted-foreground text-center">
          XP never decreases. Climbs unlock cashback, lower fees, and a
          public spotlight. Read{' '}
          <Link
            href="/sellers/program"
            className="font-semibold text-[hsl(var(--primary))] hover:underline"
          >
            the program
          </Link>{' '}
          for the full ladder.
        </p>
      </section>

      <LandingFooter />
    </div>
  );
}
