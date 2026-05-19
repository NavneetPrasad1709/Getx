'use client';

import { ShieldCheck, BadgeCheck, Zap, RefreshCcw } from 'lucide-react';

/* BrowseTrustStrip — a slim row that pins the four trust pillars directly
   above the listings grid. Buyers see them every time they shop, without the
   visual weight of a full trust section. Reused across accounts / top-ups /
   items browse pages. */

const PILLARS = [
  {
    icon: ShieldCheck,
    label: 'Escrow protected',
    sub: 'Funds released on confirm',
    tone: 'text-primary',
  },
  {
    icon: BadgeCheck,
    label: 'KYC verified sellers',
    sub: 'Aadhaar + PAN checked',
    tone: 'text-success',
  },
  {
    icon: Zap,
    label: 'Instant delivery',
    sub: 'Median 5 min',
    tone: 'text-accent',
  },
  {
    icon: RefreshCcw,
    label: 'One-tap refunds',
    sub: '3-day inspection window',
    tone: 'text-hot',
  },
];

export function BrowseTrustStrip() {
  return (
    <div className="mb-8 rounded-2xl border border-border/60 bg-surface/60 backdrop-blur-xl overflow-hidden">
      <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border/40">
        {PILLARS.map((p) => (
          <div key={p.label} className="flex items-center gap-3 px-4 py-3 md:py-4">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-current/10 ${p.tone}`}>
              <p.icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="font-display text-sm font-semibold tracking-tight truncate">
                {p.label}
              </div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground truncate">
                {p.sub}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
