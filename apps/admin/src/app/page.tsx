'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  ChevronRight,
  CircleDollarSign,
  Clock,
  EyeOff,
  Flame,
  Loader2,
  Package,
  Receipt,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Skeleton, motion, useReducedMotion } from '@getx/ui';
import { AdminShell } from '@/components/admin-shell';
import { useAdminAlerts, useDashboard, type DashboardData } from '@/hooks/use-admin';

/* GETX Admin — Dashboard.
   ─────────────────────────────────────────────────────────────────────
   "What needs me right now" answered in 3 seconds.

   Top → bottom story:
     1. Action queue — tiles for disputes, listing review, removed
        listings, hidden reviews. Each links straight to the right
        moderation page with the right filter.
     2. Live KPI grid — users, sellers, listings, orders.
     3. Money strip — GMV, take revenue, pending payouts.
     4. Audit feed — last actions with severity colour code.

   Inspired by eldorado.gg's ops console + zeusx's clean activity
   stream, then pushed with severity-aware audit rows and the
   alerts-first layout. */

const EASE = [0.22, 1, 0.36, 1] as const;

const reveal = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

/* Count-up — same pattern used elsewhere in the product. */
function useCountUp(target: number, durationMs = 800): number {
  const reduce = useReducedMotion();
  const [value, setValue] = useState(reduce ? target : 0);
  const startTsRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const fromRef = useRef(0);

  useEffect(() => {
    if (reduce) {
      setValue(target);
      return;
    }
    fromRef.current = value;
    startTsRef.current = null;
    const tick = (ts: number) => {
      if (startTsRef.current === null) startTsRef.current = ts;
      const elapsed = ts - startTsRef.current;
      const t = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(fromRef.current + (target - fromRef.current) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, reduce, durationMs]);

  return value;
}

function IntDisplay({ value }: { value: number }) {
  const animated = useCountUp(value);
  return <span className="tabular-nums">{Math.round(animated).toLocaleString('en-US')}</span>;
}

function MoneyDisplay({ value, compact = false }: { value: number; compact?: boolean }) {
  const animated = useCountUp(value);
  if (compact && animated >= 1000) {
    return (
      <span className="tabular-nums">
        ${(animated / 1000).toFixed(animated >= 10_000 ? 0 : 1)}K
      </span>
    );
  }
  return (
    <span className="tabular-nums">
      ${Math.round(animated).toLocaleString('en-US')}
    </span>
  );
}

export default function DashboardPage() {
  const { data, isLoading } = useDashboard();
  const alerts = useAdminAlerts();

  const totalAlerts = useMemo(
    () =>
      alerts.counts.disputes +
      alerts.counts.pendingListings +
      alerts.counts.removedListings +
      alerts.counts.hiddenReviews,
    [alerts.counts],
  );

  return (
    <AdminShell>
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } } }}
        className="px-4 sm:px-6 lg:px-10 py-6 lg:py-10 max-w-7xl mx-auto space-y-6 lg:space-y-8"
      >
        {/* ── HEADER ─────────────────────────────────────────────────── */}
        <motion.div variants={reveal}>
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-error font-bold mb-1.5">
                Operations console
              </div>
              <h1 className="font-display text-3xl lg:text-4xl font-extrabold tracking-tight">
                Dashboard
              </h1>
              <p className="text-[13.5px] text-muted-foreground mt-1">
                {totalAlerts > 0
                  ? `${totalAlerts} item${totalAlerts === 1 ? '' : 's'} need attention — clear them below.`
                  : 'All clear. Quiet day on the marketplace.'}
              </p>
            </div>
            <LiveDot />
          </div>
        </motion.div>

        {/* ── ACTION QUEUE — top priority ────────────────────────────── */}
        <motion.section variants={reveal}>
          <SectionHead
            eyebrow="Action queue"
            title="What needs you right now"
            subtitle="Each tile links to the moderation view filtered for that bucket."
          />
          <ActionQueue alerts={alerts} />
        </motion.section>

        {/* ── LIVE KPIs ──────────────────────────────────────────────── */}
        <motion.section variants={reveal}>
          <SectionHead eyebrow="Live KPIs" title="Marketplace health" />
          {isLoading || !data ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-2xl" />
              ))}
            </div>
          ) : (
            <KpiGrid data={data} />
          )}
        </motion.section>

        {/* ── MONEY STRIP ────────────────────────────────────────────── */}
        <motion.section variants={reveal}>
          <SectionHead eyebrow="Money" title="Volume + take + payouts" />
          {isLoading || !data ? (
            <Skeleton className="h-36 rounded-3xl" />
          ) : (
            <MoneyStrip data={data} />
          )}
        </motion.section>

        {/* ── AUDIT FEED ─────────────────────────────────────────────── */}
        <motion.section variants={reveal}>
          <SectionHead
            eyebrow="Activity"
            title="Recent audit events"
            action={{ href: '/audit-logs', label: 'See all logs' }}
          />
          {isLoading || !data ? (
            <Skeleton className="h-72 rounded-3xl" />
          ) : (
            <AuditFeed logs={data.recentAudits} />
          )}
        </motion.section>
      </motion.div>
    </AdminShell>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  LIVE DOT — refreshing indicator                                     */
/* ══════════════════════════════════════════════════════════════════ */
function LiveDot() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 bg-success/10 ring-1 ring-success/25 text-success">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inset-0 rounded-full bg-success opacity-75" />
        <span className="relative rounded-full h-2 w-2 bg-success" />
      </span>
      <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] font-bold">
        Live · refreshes every 60s
      </span>
    </span>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  ACTION QUEUE                                                        */
/* ══════════════════════════════════════════════════════════════════ */
function ActionQueue({ alerts }: { alerts: ReturnType<typeof useAdminAlerts> }) {
  const items = [
    {
      key: 'disputes',
      icon: AlertTriangle,
      label: 'Open disputes',
      count: alerts.counts.disputes,
      tone: 'error',
      href: '/orders?status=DISPUTED',
      hint: 'Orders flagged for support intervention',
    },
    {
      key: 'pendingListings',
      icon: Sparkles,
      label: 'Pending listing review',
      count: alerts.counts.pendingListings,
      tone: 'warning',
      href: '/listings?status=PENDING_REVIEW',
      hint: 'New listings awaiting moderation',
    },
    {
      key: 'removedListings',
      icon: EyeOff,
      label: 'Removed listings',
      count: alerts.counts.removedListings,
      tone: 'muted',
      href: '/listings?status=REMOVED',
      hint: 'Listings taken down — audit if needed',
    },
    {
      key: 'hiddenReviews',
      icon: Star,
      label: 'Hidden reviews',
      count: alerts.counts.hiddenReviews,
      tone: 'muted',
      href: '/reviews?hidden=true',
      hint: 'Reviews currently hidden by moderators',
    },
  ] as const;

  const tones: Record<string, { ring: string; bg: string; iconBg: string; iconFg: string; numFg: string }> = {
    error: {
      ring: 'ring-error/30',
      bg: 'bg-gradient-to-br from-error/10 via-surface to-surface',
      iconBg: 'bg-error/15',
      iconFg: 'text-error',
      numFg: 'text-error',
    },
    warning: {
      ring: 'ring-warning/25',
      bg: 'bg-gradient-to-br from-warning/10 via-surface to-surface',
      iconBg: 'bg-warning/15',
      iconFg: 'text-warning',
      numFg: 'text-foreground',
    },
    muted: {
      ring: 'ring-border',
      bg: 'bg-surface',
      iconBg: 'bg-muted/30',
      iconFg: 'text-muted-foreground',
      numFg: 'text-foreground',
    },
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
      {items.map((it, idx) => {
        const Icon = it.icon;
        const tone = tones[it.tone];
        const urgent = it.tone === 'error' && it.count > 0;
        return (
          <motion.div
            key={it.key}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05, duration: 0.4, ease: EASE }}
            whileHover={{ y: -3 }}
          >
            <Link
              href={it.href}
              className={`group relative block overflow-hidden rounded-2xl ring-1 ${tone.ring} ${tone.bg} p-4 lg:p-5 hover:shadow-[0_18px_44px_-22px_hsl(var(--foreground)/0.2)] transition-shadow`}
            >
              {urgent && (
                <motion.div
                  aria-hidden
                  className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-error/20 blur-3xl"
                  animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.7, 0.4] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}
              <div className="relative flex items-start justify-between gap-2 mb-3">
                <motion.div
                  whileHover={{ rotate: -6, scale: 1.08 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 16 }}
                  className={`grid place-items-center h-10 w-10 rounded-xl ${tone.iconBg} ${tone.iconFg}`}
                >
                  <Icon className="h-5 w-5" strokeWidth={2.25} />
                </motion.div>
                {urgent && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-error text-error-foreground font-mono text-[9.5px] uppercase tracking-[0.18em] font-bold">
                    <Flame className="h-3 w-3" strokeWidth={2.5} />
                    Urgent
                  </span>
                )}
              </div>
              <div className={`font-display font-extrabold text-3xl lg:text-[34px] tabular-nums leading-none mb-1.5 ${tone.numFg}`}>
                <IntDisplay value={it.count} />
              </div>
              <div className="text-[12.5px] font-semibold text-foreground">{it.label}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{it.hint}</div>
              <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  {it.count === 0 ? 'Inbox zero' : 'Open queue'}
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  KPI GRID                                                            */
/* ══════════════════════════════════════════════════════════════════ */
function KpiGrid({ data }: { data: DashboardData }) {
  const items = [
    {
      icon: Users,
      label: 'Total users',
      value: data.users.total,
      hint: `+${data.users.newThisWeek} this week`,
      tone: 'primary',
    },
    {
      icon: BadgeCheck,
      label: 'Active sellers',
      value: data.users.activeSellers,
      hint: 'Currently selling',
      tone: 'accent',
    },
    {
      icon: Tag,
      label: 'Active listings',
      value: data.listings.active,
      hint: `${data.listings.total} total ever`,
      tone: 'success',
    },
    {
      icon: Package,
      label: 'Total orders',
      value: data.orders.total,
      hint: `${data.orders.thisWeek} this week`,
      tone: 'primary',
    },
  ] as const;
  const tones: Record<string, string> = {
    primary: 'text-primary bg-primary/10',
    accent: 'text-accent bg-accent/10',
    success: 'text-success bg-success/10',
  };
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
      {items.map((it, idx) => {
        const Icon = it.icon;
        return (
          <motion.div
            key={it.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05, duration: 0.4, ease: EASE }}
            whileHover={{ y: -3 }}
            className="rounded-2xl bg-surface ring-1 ring-border p-4 lg:p-5 hover:ring-foreground/15 transition-shadow hover:shadow-[0_14px_36px_-22px_hsl(var(--foreground)/0.2)]"
          >
            <div className={`grid place-items-center h-9 w-9 rounded-xl mb-3 ${tones[it.tone]}`}>
              <Icon className="h-4 w-4" strokeWidth={2.25} />
            </div>
            <div className="font-display font-extrabold text-2xl lg:text-[28px] tabular-nums leading-none mb-1">
              <IntDisplay value={it.value} />
            </div>
            <div className="text-[12px] font-semibold text-foreground">{it.label}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{it.hint}</div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  MONEY STRIP                                                         */
/* ══════════════════════════════════════════════════════════════════ */
function MoneyStrip({ data }: { data: DashboardData }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-surface to-accent/6 ring-1 ring-primary/20 p-5 lg:p-7">
      <motion.div
        aria-hidden
        className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-primary/15 blur-3xl"
        animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.75, 0.5] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-6 lg:gap-10">
        <MoneyTile
          icon={CircleDollarSign}
          label="GMV all-time"
          value={data.gmv.allTime}
          sub={`+$${data.gmv.thisWeek.toFixed(0)} this week`}
          tone="primary"
        />
        <MoneyTile
          icon={Receipt}
          label="Revenue (take)"
          value={data.revenue.allTime}
          sub={`+$${data.revenue.thisWeek.toFixed(0)} this week`}
          tone="success"
          accent
        />
        <MoneyTile
          icon={Banknote}
          label="Pending payouts"
          value={data.pendingPayouts}
          sub={`${data.totalReviews} lifetime reviews`}
          tone="accent"
        />
      </div>
    </div>
  );
}

function MoneyTile({
  icon: Icon,
  label,
  value,
  sub,
  tone,
  accent,
}: {
  icon: typeof CircleDollarSign;
  label: string;
  value: number;
  sub: string;
  tone: 'primary' | 'success' | 'accent';
  accent?: boolean;
}) {
  const tones: Record<string, string> = {
    primary: 'text-primary bg-primary/12',
    success: 'text-success bg-success/12',
    accent: 'text-accent bg-accent/12',
  };
  return (
    <div className={accent ? 'sm:border-x sm:border-border sm:px-6 lg:px-10' : ''}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`grid place-items-center h-8 w-8 rounded-lg ${tones[tone]}`}>
          <Icon className="h-4 w-4" strokeWidth={2.25} />
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] font-bold text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="font-display font-extrabold text-3xl lg:text-[36px] tabular-nums leading-none mb-1.5">
        <MoneyDisplay value={value} />
      </div>
      <div className="text-[11.5px] text-muted-foreground inline-flex items-center gap-1">
        <TrendingUp className="h-3 w-3 text-success" strokeWidth={2.5} />
        {sub}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  AUDIT FEED                                                          */
/* ══════════════════════════════════════════════════════════════════ */
function AuditFeed({
  logs,
}: {
  logs: DashboardData['recentAudits'];
}) {
  if (!logs || logs.length === 0) {
    return (
      <div className="rounded-3xl bg-surface ring-1 ring-border p-10 text-center">
        <div className="grid place-items-center h-12 w-12 rounded-full bg-success/12 text-success mx-auto mb-3">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="font-semibold text-[14px] mb-0.5">Quiet log</div>
        <div className="text-[12.5px] text-muted-foreground">
          No admin events recorded yet.
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-2xl bg-surface ring-1 ring-border overflow-hidden">
      <ul className="divide-y divide-border">
        {logs.map((log, idx) => (
          <motion.li
            key={log.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: Math.min(idx, 8) * 0.03, duration: 0.3, ease: EASE }}
          >
            <AuditRow log={log} />
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

function AuditRow({ log }: { log: DashboardData['recentAudits'][number] }) {
  const meta = SEVERITY_META[log.severity] ?? SEVERITY_META.INFO;
  const Icon = meta.icon;
  return (
    <div className="flex items-center gap-3 sm:gap-4 p-3.5 sm:p-4 hover:bg-muted/15 transition-colors group">
      <div
        className={`grid place-items-center h-9 w-9 rounded-xl shrink-0 ${meta.bg} ${meta.fg}`}
      >
        <Icon className="h-4 w-4" strokeWidth={2.25} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className={`font-mono text-[9.5px] uppercase tracking-[0.18em] font-bold ${meta.fg}`}>
            {log.severity}
          </span>
          <span className="font-mono text-[12px] text-foreground truncate">{log.action}</span>
        </div>
        <div className="text-[11.5px] text-muted-foreground truncate">
          {log.entity ? (
            <>
              {log.entity}
              {log.entityId && (
                <span className="font-mono opacity-75">:{log.entityId.slice(-8)}</span>
              )}
            </>
          ) : (
            'System event'
          )}
        </div>
      </div>
      <div className="font-mono text-[10.5px] text-muted-foreground tabular-nums shrink-0">
        {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  );
}

const SEVERITY_META: Record<
  string,
  { bg: string; fg: string; icon: typeof Activity }
> = {
  DEBUG: { bg: 'bg-muted/30', fg: 'text-muted-foreground', icon: Activity },
  INFO: { bg: 'bg-primary/12', fg: 'text-primary', icon: Activity },
  WARNING: { bg: 'bg-warning/12', fg: 'text-warning', icon: AlertTriangle },
  ERROR: { bg: 'bg-error/12', fg: 'text-error', icon: AlertTriangle },
  CRITICAL: { bg: 'bg-error/15', fg: 'text-error', icon: ShieldAlert },
};

/* ══════════════════════════════════════════════════════════════════ */
/*  SECTION HEAD                                                        */
/* ══════════════════════════════════════════════════════════════════ */
function SectionHead({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex items-end justify-between gap-3 mb-4 flex-wrap">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary font-bold mb-1.5">
          {eyebrow}
        </div>
        <h2 className="font-display text-xl lg:text-2xl font-bold tracking-tight">{title}</h2>
        {subtitle && (
          <p className="text-[12.5px] text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && (
        <Link
          href={action.href}
          className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary border-b border-primary/30 hover:border-primary pb-0.5 transition-all"
        >
          {action.label}
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

/* Silence unused — kept for future widgets. */
void ChevronRight;
void Clock;
void Loader2;
void ScrollText;
