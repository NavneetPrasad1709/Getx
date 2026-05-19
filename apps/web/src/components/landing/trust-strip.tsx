'use client';

import { ShieldCheck, Zap, BadgeCheck, RefreshCcw } from 'lucide-react';

/* TrustStrip — slim ribbon directly under the hero.

   Eldorado pins one of these above its catalog. Light surface, hairline
   cells, blue accent icons. Job: kill the buyer's "is this safe?" question
   in under five seconds without forcing a scroll. */

const ITEMS = [
  { icon: ShieldCheck, label: 'Escrow on every order', sub: 'Funds held until you confirm' },
  { icon: BadgeCheck, label: 'KYC-verified Indian sellers', sub: 'Aadhaar + PAN cross-checked' },
  { icon: Zap, label: 'Sub-10 min delivery', sub: '5-min median · 24/7 uptime' },
  { icon: RefreshCcw, label: '7-day money-back', sub: 'One-tap refunds if anything is off' },
];

export function TrustStrip() {
  return (
    <section
      aria-label="Trust signals"
      className="relative px-4 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-[1400px] -mt-4 sm:-mt-6 relative z-10">
        <ul className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[hsl(var(--border))] bg-white rounded-2xl shadow-[0_8px_24px_hsl(222_24%_8%/0.06)] border border-[hsl(var(--border))] overflow-hidden">
          {ITEMS.map((item) => (
            <li
              key={item.label}
              className="flex items-center gap-3 px-4 py-4 md:py-5"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--primary)/0.08)] text-[hsl(var(--primary))]">
                <item.icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-[hsl(var(--foreground))] leading-tight truncate">
                  {item.label}
                </div>
                <div className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5 truncate">
                  {item.sub}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
