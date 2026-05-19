'use client';

import * as React from 'react';
import { ShieldCheck, RefreshCcw, Headset } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@getx/ui';
import { GetxShieldExplain } from './getx-shield-explain';

/* GetxShieldBadge — sitewide insurance badge.

   Variants:
   - compact (18px pill): "Insured"            → listing-card / product-rail
   - inline  (28px pill): "GETX Shield · 100% refund" → order page / checkout
   - large   (card):      3-bullet payoff       → PDP BuyPanel trust block

   When `showTooltip` is true (default for compact + inline), hover/focus/tap
   opens a Radix tooltip rendering the full explainer. */

type ShieldVariant = 'compact' | 'inline' | 'large';

interface Props {
  variant: ShieldVariant;
  showTooltip?: boolean;
  className?: string;
}

export function GetxShieldBadge({ variant, showTooltip, className }: Props) {
  if (variant === 'large') {
    return <ShieldLargeCard className={className} />;
  }

  const enableTooltip = showTooltip ?? true;
  const pill =
    variant === 'compact' ? (
      <CompactPill interactive={enableTooltip} />
    ) : (
      <InlinePill interactive={enableTooltip} />
    );

  if (!enableTooltip) {
    return <span className={className}>{pill}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={className}>{pill}</span>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={6}
        className="max-w-[280px] bg-[hsl(var(--surface))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] shadow-[0_24px_60px_-20px_hsl(0_0%_0%/0.25)] p-3.5"
      >
        <GetxShieldExplain />
      </TooltipContent>
    </Tooltip>
  );
}

function CompactPill({ interactive }: { interactive: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 h-[18px] px-2 rounded-full bg-[hsl(var(--primary)/0.08)] border border-[hsl(var(--primary)/0.25)] text-[hsl(var(--primary))] text-[11px] font-semibold leading-none whitespace-nowrap select-none ${
        interactive
          ? 'cursor-help hover:bg-[hsl(var(--primary)/0.14)] hover:ring-2 hover:ring-[hsl(var(--primary)/0.2)] transition-all'
          : ''
      }`}
      role="img"
      aria-label="GETX Shield · Insured"
    >
      <ShieldCheck className="h-3 w-3" aria-hidden />
      Insured
    </span>
  );
}

function InlinePill({ interactive }: { interactive: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 h-[28px] px-3 rounded-full bg-[hsl(var(--primary)/0.08)] border border-[hsl(var(--primary)/0.25)] text-[hsl(var(--primary))] text-[13px] font-semibold whitespace-nowrap select-none ${
        interactive
          ? 'cursor-help hover:bg-[hsl(var(--primary)/0.14)] hover:ring-2 hover:ring-[hsl(var(--primary)/0.2)] transition-all'
          : ''
      }`}
      role="img"
      aria-label="GETX Shield · 100% refund insured"
    >
      <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
      GETX Shield <span aria-hidden className="opacity-50">·</span> 100% refund
    </span>
  );
}

function ShieldLargeCard({ className }: { className?: string }) {
  const bullets: Array<{
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    body: string;
  }> = [
    {
      icon: ShieldCheck,
      title: 'Vault-held payment',
      body: 'Seller never sees a rupee until you confirm receipt.',
    },
    {
      icon: RefreshCcw,
      title: '100% auto-refund',
      body: 'Outside SLA or fails verification → instant refund.',
    },
    {
      icon: Headset,
      title: 'Indian dispute team',
      body: 'Median close under 24 hrs · 10am-11pm IST chat.',
    },
  ];

  return (
    <div
      className={`rounded-2xl border border-[hsl(var(--primary)/0.25)] bg-[hsl(var(--primary)/0.06)] p-4 ${className ?? ''}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))]">
          <ShieldCheck className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <div className="font-display text-[13px] font-extrabold text-[hsl(var(--foreground))] leading-tight">
            GETX Shield
          </div>
          <div className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">
            Insurance built into every order
          </div>
        </div>
      </div>
      <ul className="space-y-2.5">
        {bullets.map((b) => (
          <li key={b.title} className="flex items-start gap-2.5">
            <b.icon className="h-3.5 w-3.5 text-[hsl(var(--primary))] mt-0.5 shrink-0" />
            <div className="min-w-0">
              <div className="text-[12.5px] font-semibold text-[hsl(var(--foreground))] leading-tight">
                {b.title}
              </div>
              <div className="text-[11.5px] text-[hsl(var(--muted-foreground))] leading-snug mt-0.5">
                {b.body}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
