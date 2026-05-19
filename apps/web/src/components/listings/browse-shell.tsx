'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@getx/ui';
import { SlidersHorizontal, X, ArrowDownAZ } from 'lucide-react';
import type { ListingFilters, SortOption } from '@/hooks/use-listings';

export type ActiveChip = {
  key: keyof ListingFilters | string;
  label: string;
  onRemove: () => void;
};

/* Compact browse header — matches the dense one-screen pattern from
   /games/pokemon-go/boosting so the buyer drops into listings without
   a giant marketing block stealing half the viewport. */
export function BrowseHeader({
  eyebrow,
  title,
  subtitle,
  trail,
  stats,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  trail: Array<{ href?: string; label: string }>;
  stats?: Array<{ label: string; value: string }>;
}) {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_-20%,hsl(var(--primary)/0.14),transparent_70%)]" />
      <div className="container relative py-4 md:py-6">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground mb-2 flex-wrap"
        >
          {trail.map((t, i) => (
            <React.Fragment key={i}>
              {t.href ? (
                <Link href={t.href} className="hover:text-foreground transition-colors">
                  {t.label}
                </Link>
              ) : (
                <span className="text-foreground">{t.label}</span>
              )}
              {i < trail.length - 1 && <span aria-hidden className="text-muted-foreground/50">›</span>}
            </React.Fragment>
          ))}
        </nav>

        <div className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-primary mb-1.5 font-bold">
          {eyebrow}
        </div>
        <h1 className="font-display text-[clamp(1.5rem,3vw,2.25rem)] font-extrabold tracking-tight leading-[1] text-foreground">
          {title}
        </h1>
        <p className="mt-1.5 text-[12.5px] md:text-[13px] text-muted-foreground max-w-2xl leading-relaxed">
          {subtitle}
        </p>

        {stats && stats.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
            {stats.map((s) => (
              <div key={s.label} className="inline-flex items-baseline gap-1.5">
                <span className="font-display text-[15px] font-extrabold tabular-nums text-foreground">
                  {s.value}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Most popular' },
  { value: 'price-asc', label: 'Price ↑' },
  { value: 'price-desc', label: 'Price ↓' },
  { value: 'rating-desc', label: 'Top sellers' },
];

export function PillFilterBar({
  total,
  isLoading,
  activeChips,
  sort,
  onSortChange,
  onClearAll,
  onOpenFilters,
  saveSearchSlot,
}: {
  total: number | null;
  isLoading: boolean;
  activeChips: ActiveChip[];
  sort: SortOption;
  onSortChange: (s: SortOption) => void;
  onClearAll: () => void;
  onOpenFilters?: () => void;
  /* Optional slot for the SaveSearchButton — renders inline between
     active chips and the sort dropdown when provided. */
  saveSearchSlot?: React.ReactNode;
}) {
  // Sticky filter bar — full-width band, no negative margins so it
  // never breaks past the viewport (was causing horizontal scroll on
  // mobile). Inner content still aligns to the container.
  return (
    <div className="sticky top-20 z-30 w-full px-3 md:px-6 py-3 mb-6 bg-background/85 backdrop-blur-2xl border-y border-border/40">
      <div className="container flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenFilters}
            className="rounded-full md:hidden"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
          </Button>

          <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground tabular-nums">
            {isLoading ? '…' : `${total ?? 0} results`}
          </div>
        </div>

        <div className="flex-1 min-w-0 overflow-x-auto -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex items-center gap-1.5 w-max">
            {activeChips.length === 0 ? (
              <span className="font-mono text-[11px] text-muted-foreground/70 italic">
                No filters applied
              </span>
            ) : (
              <>
                {activeChips.map((c) => (
                  <button
                    key={String(c.key)}
                    onClick={c.onRemove}
                    className="group inline-flex items-center gap-1.5 pl-3 pr-1.5 h-10 sm:h-9 rounded-full bg-primary/10 text-primary border border-primary/30 font-mono text-[11px] uppercase tracking-wider hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    {c.label}
                    <span className="h-5 w-5 rounded-full bg-primary/20 group-hover:bg-primary-foreground/20 grid place-items-center">
                      <X className="h-3 w-3" />
                    </span>
                  </button>
                ))}
                <button
                  onClick={onClearAll}
                  className="inline-flex items-center h-10 sm:h-9 px-3 rounded-full text-muted-foreground hover:text-foreground font-mono text-[11px] uppercase tracking-wider underline-offset-4 hover:underline"
                >
                  Clear all
                </button>
              </>
            )}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2 shrink-0">
          {saveSearchSlot}
          <div className="hidden sm:inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            <ArrowDownAZ className="h-3.5 w-3.5" />
            Sort
          </div>
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="h-10 sm:h-9 rounded-full border border-border/60 bg-surface-elevated px-3 pr-8 font-mono text-[11px] uppercase tracking-wider text-foreground focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Sort"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  body,
  actions,
}: {
  title: string;
  body: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-border/60 bg-surface/30 backdrop-blur p-12 text-center max-w-2xl mx-auto">
      <div className="h-14 w-14 mx-auto mb-5 rounded-2xl bg-primary/10 grid place-items-center">
        <SlidersHorizontal className="h-6 w-6 text-primary" />
      </div>
      <h2 className="font-display text-2xl font-bold mb-2">{title}</h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">{body}</p>
      {actions && <div className="flex flex-wrap items-center justify-center gap-3">{actions}</div>}
    </div>
  );
}
