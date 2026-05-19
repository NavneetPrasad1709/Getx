'use client';

import Link from 'next/link';
import {
  ShieldCheck,
  BadgeCheck,
  Bell,
  CreditCard,
  MapPin,
  Lock,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useKycStatus } from '@/hooks/use-account';

/* Settings overview — shows compact status tiles for each subsection so
   the buyer can see what's verified / pending / missing at a glance. */

export default function SettingsOverviewPage() {
  const { user, isAuthenticated } = useAuth();
  const { data: kyc } = useKycStatus(isAuthenticated);

  const kycLabel = (() => {
    const s = kyc?.status ?? 'NONE';
    if (s === 'VERIFIED') return { label: 'Verified', tone: 'success' as const };
    if (s === 'SUBMITTED' || s === 'PENDING')
      return { label: 'Under review', tone: 'warning' as const };
    if (s === 'REJECTED') return { label: 'Rejected', tone: 'error' as const };
    return { label: 'Not submitted', tone: 'muted' as const };
  })();

  return (
    <div>
      <p className="text-[14px] text-muted-foreground mb-8 max-w-xl">
        Manage account-level preferences in one place. Changes to email /
        password log you out everywhere else.
      </p>

      <div className="rounded-3xl border border-border/60 bg-surface/60 p-6 mb-8">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
          Signed in as
        </div>
        <div className="font-display text-lg font-bold">
          {user?.name ?? '—'}
        </div>
        <div className="text-[13px] text-muted-foreground truncate">
          {user?.email ?? ''}
        </div>
      </div>

      <ul className="grid sm:grid-cols-2 gap-3">
        <OverviewTile
          icon={Lock}
          title="Security"
          status="Manage"
          tone="muted"
          description="Password + two-factor"
          href="/profile/settings/security"
        />
        <OverviewTile
          icon={BadgeCheck}
          title="KYC verification"
          status={kycLabel.label}
          tone={kycLabel.tone}
          description="ID + selfie via Sumsub"
          href="/profile/settings/kyc"
        />
        <OverviewTile
          icon={Bell}
          title="Notifications"
          status="Manage"
          tone="muted"
          description="Email · push · SMS"
          href="/profile/settings/notifications"
        />
        <OverviewTile
          icon={CreditCard}
          title="Payment methods"
          status="Manage"
          tone="muted"
          description="Saved UPI IDs"
          href="/profile/settings/payment-methods"
        />
        <OverviewTile
          icon={MapPin}
          title="Addresses"
          status="Manage"
          tone="muted"
          description="Billing + tax ID"
          href="/profile/settings/addresses"
        />
        <OverviewTile
          icon={ShieldCheck}
          title="Privacy"
          status="Manage"
          tone="muted"
          description="Data export · Delete"
          href="/profile/settings/privacy"
        />
      </ul>
    </div>
  );
}

function OverviewTile({
  icon: Icon,
  title,
  description,
  status,
  tone,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  status: string;
  tone: 'success' | 'warning' | 'error' | 'muted';
  href: string;
}) {
  const toneCls =
    tone === 'success'
      ? 'bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]'
      : tone === 'warning'
        ? 'bg-[hsl(28_92%_55%/0.15)] text-[hsl(28_92%_55%)]'
        : tone === 'error'
          ? 'bg-[hsl(var(--error)/0.12)] text-[hsl(var(--error))]'
          : 'bg-[hsl(var(--muted-foreground)/0.15)] text-[hsl(var(--muted-foreground))]';
  return (
    <li>
      <Link
        href={href}
        className="group flex items-center gap-4 rounded-2xl border border-border/50 bg-surface/40 p-5 hover:border-[hsl(var(--primary)/0.4)] hover:bg-surface/60 transition-colors"
      >
        <span className="h-10 w-10 rounded-xl bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))] grid place-items-center shrink-0">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-display text-[14px] font-extrabold">
              {title}
            </span>
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${toneCls}`}
            >
              {status}
            </span>
          </div>
          <div className="text-[12px] text-muted-foreground">{description}</div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-[hsl(var(--primary))] shrink-0" />
      </Link>
    </li>
  );
}
