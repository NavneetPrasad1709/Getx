import { ShieldCheck, RefreshCcw, Headset } from 'lucide-react';

/* GetxShieldExplain — 3-bullet payoff used inside the Shield tooltip and
   anywhere the full explainer is needed (PDP "How does it work?" links). */

const POINTS: Array<{
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}> = [
  {
    icon: ShieldCheck,
    title: 'Vault-held payment',
    body: 'Your money stays with GETX until you confirm receipt — the seller never sees a rupee before you do.',
  },
  {
    icon: RefreshCcw,
    title: '100% auto-refund',
    body: 'If a drop falls outside SLA or fails verification, full refund auto-triggers. No paperwork.',
  },
  {
    icon: Headset,
    title: 'Indian dispute team',
    body: 'Median dispute close under 24 hours · 10am-11pm IST chat · async email outside that window.',
  },
];

export function GetxShieldExplain({
  variant = 'tooltip',
}: {
  variant?: 'tooltip' | 'modal';
}) {
  return (
    <div className={variant === 'modal' ? 'space-y-4' : 'space-y-2.5'}>
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-[hsl(var(--primary))]" />
        <span className="font-display text-[13px] font-extrabold tracking-tight">
          GETX Shield · How it protects you
        </span>
      </div>
      <ul className={variant === 'modal' ? 'space-y-3' : 'space-y-2'}>
        {POINTS.map((p) => (
          <li key={p.title} className="flex items-start gap-2">
            <p.icon className="h-3.5 w-3.5 text-[hsl(var(--primary))] mt-0.5 shrink-0" />
            <div className="min-w-0">
              <div className="text-[12px] font-semibold leading-tight">{p.title}</div>
              <div className="text-[11px] opacity-75 leading-snug mt-0.5">{p.body}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
