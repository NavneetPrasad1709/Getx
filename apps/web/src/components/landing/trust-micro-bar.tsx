'use client';

import { ShieldCheck, Zap, BadgeCheck, RefreshCcw } from 'lucide-react';

/* TrustMicroBar — slim 4-cell trust ribbon.

   Sits between the hero and the category pills, mirroring the trust strip
   Eldorado pins above its game catalog. Pure black, hairline-divided cells,
   yellow accent icons. No glow, no gradient. */

const ITEMS = [
  { icon: ShieldCheck, label: 'Escrow on every order', sub: 'Funds held until you confirm' },
  { icon: BadgeCheck, label: 'KYC-verified sellers', sub: 'Aadhaar + PAN cross-checked' },
  { icon: Zap, label: 'Sub-10 min delivery', sub: '5-min median · 24/7 uptime' },
  { icon: RefreshCcw, label: 'One-tap refunds', sub: '3-day inspection window' },
];

export function TrustMicroBar() {
  return (
    <section
      aria-label="Trust signals"
      className="relative bg-[hsl(0_0%_3%)] border-y border-border/60"
    >
      <div className="container">
        <ul className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border/60">
          {ITEMS.map((item) => (
            <li key={item.label} className="flex items-center gap-3 px-3 md:px-4 py-4 md:py-5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-primary/10 text-primary">
                <item.icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <div className="font-display text-sm font-bold uppercase tracking-tight text-white leading-tight">
                  {item.label}
                </div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-white/45 mt-0.5 truncate">
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
