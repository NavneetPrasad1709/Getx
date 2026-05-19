'use client';

import * as React from 'react';
import { Check, Clock } from 'lucide-react';
import { formatMoney } from '@/lib/currency';

/* VariantPicker — radio cards on PDP right rail.

   Desktop: vertical stack inside the BuyPanel column.
   Mobile:  horizontal snap-scroll rail so all variants stay visible without
            collapsing the buy area.

   The active card has a cobalt ring + checked dot. Out-of-stock variants
   render grayscale with an "Out of stock" overlay and pointer-events: none. */

export interface VariantOption {
  id: string;
  label: string;
  sublabel?: string | null;
  price: number;
  originalPrice?: number | null;
  stockLeft?: number | null;
  deliveryEta?: string | null;
  badge?: string | null;
}

interface Props {
  variants: VariantOption[];
  activeId: string;
  onSelect: (id: string) => void;
  currency: string | null | undefined;
  title?: string;
  className?: string;
}

export function VariantPicker({
  variants,
  activeId,
  onSelect,
  currency,
  title = 'Choose your package',
  className,
}: Props) {
  if (variants.length <= 1) return null;

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-[13px] font-extrabold uppercase tracking-[0.15em] text-[hsl(var(--muted-foreground))]">
          {title}
        </h3>
        <span className="text-[11px] text-[hsl(var(--muted-foreground))] tabular-nums">
          {variants.length} options
        </span>
      </div>

      {/* Mobile: horizontal snap rail · Desktop: vertical stack */}
      <div
        role="radiogroup"
        aria-label={title}
        className="
          flex gap-2.5 overflow-x-auto snap-x snap-mandatory pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
          md:grid md:grid-cols-1 md:gap-2.5 md:overflow-visible md:pb-0
        "
      >
        {variants.map((v) => (
          <VariantCard
            key={v.id}
            variant={v}
            active={v.id === activeId}
            currency={currency}
            onSelect={() => onSelect(v.id)}
          />
        ))}
      </div>
    </div>
  );
}

function VariantCard({
  variant,
  active,
  currency,
  onSelect,
}: {
  variant: VariantOption;
  active: boolean;
  currency: string | null | undefined;
  onSelect: () => void;
}) {
  const outOfStock =
    typeof variant.stockLeft === 'number' && variant.stockLeft <= 0;
  const lowStock =
    !outOfStock &&
    typeof variant.stockLeft === 'number' &&
    variant.stockLeft > 0 &&
    variant.stockLeft <= 3;

  const saved =
    variant.originalPrice && variant.originalPrice > variant.price
      ? variant.originalPrice - variant.price
      : 0;
  const discountPct =
    variant.originalPrice && variant.originalPrice > variant.price
      ? Math.round(((variant.originalPrice - variant.price) / variant.originalPrice) * 100)
      : 0;

  const baseCls =
    'relative shrink-0 snap-start min-w-[220px] md:min-w-0 md:w-full text-left rounded-2xl border p-4 transition-all duration-200';
  const stateCls = outOfStock
    ? 'border-[hsl(var(--border))] bg-[hsl(var(--surface-elevated)/0.4)] cursor-not-allowed grayscale opacity-60'
    : active
      ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.06)] ring-2 ring-[hsl(var(--primary)/0.35)] shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.4)]'
      : 'border-[hsl(var(--border))] bg-[hsl(var(--surface))] hover:border-[hsl(var(--primary)/0.5)] hover:bg-[hsl(var(--surface-elevated)/0.6)] cursor-pointer';

  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-disabled={outOfStock || undefined}
      tabIndex={outOfStock ? -1 : 0}
      disabled={outOfStock}
      onClick={onSelect}
      className={`${baseCls} ${stateCls}`}
    >
      {/* Badge */}
      {variant.badge ? (
        <span className="absolute -top-2 left-4 inline-flex items-center px-2 py-0.5 rounded-full bg-[hsl(var(--primary))] text-white text-[10px] font-bold uppercase tracking-wider shadow-[0_4px_12px_-4px_hsl(var(--primary)/0.5)]">
          {variant.badge}
        </span>
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-display text-[15px] font-extrabold text-[hsl(var(--foreground))] leading-tight truncate">
            {variant.label}
          </div>
          {variant.sublabel ? (
            <div className="mt-0.5 text-[11.5px] text-[hsl(var(--muted-foreground))] truncate">
              {variant.sublabel}
            </div>
          ) : null}
        </div>

        {/* Checked dot */}
        <span
          aria-hidden
          className={`relative shrink-0 h-5 w-5 rounded-full border-2 transition-all ${
            active
              ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))]'
              : 'border-[hsl(var(--border))] bg-transparent'
          }`}
        >
          {active ? (
            <Check className="absolute inset-0 m-auto h-3 w-3 text-white" strokeWidth={3} />
          ) : null}
        </span>
      </div>

      <div className="mt-3 flex items-baseline gap-2 flex-wrap">
        <span className="font-display text-xl font-extrabold tabular-nums text-[hsl(var(--foreground))] leading-none">
          {formatMoney(variant.price, currency)}
        </span>
        {variant.originalPrice && variant.originalPrice > variant.price ? (
          <span className="font-mono text-[11px] text-[hsl(var(--muted-foreground))] line-through tabular-nums">
            {formatMoney(variant.originalPrice, currency)}
          </span>
        ) : null}
        {discountPct > 0 ? (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))] text-[10px] font-bold tabular-nums">
            −{discountPct}%
          </span>
        ) : null}
      </div>

      {(variant.deliveryEta || lowStock || saved > 0) && (
        <div className="mt-2 flex items-center gap-2 text-[11px] text-[hsl(var(--muted-foreground))] flex-wrap">
          {variant.deliveryEta ? (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              ETA {variant.deliveryEta}
            </span>
          ) : null}
          {lowStock ? (
            <span className="inline-flex items-center text-[hsl(28_92%_55%)] font-semibold">
              Only {variant.stockLeft} left
            </span>
          ) : null}
          {saved > 0 ? (
            <span className="inline-flex items-center font-semibold text-[hsl(var(--success))]">
              Save {formatMoney(saved, currency)}
            </span>
          ) : null}
        </div>
      )}

      {/* Out-of-stock overlay */}
      {outOfStock ? (
        <span className="absolute inset-0 grid place-items-center rounded-2xl bg-[hsl(var(--background)/0.65)] backdrop-blur-[2px]">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-[hsl(var(--error)/0.12)] text-[hsl(var(--error))] text-[11px] font-bold uppercase tracking-wider">
            Out of stock
          </span>
        </span>
      ) : null}
    </button>
  );
}
