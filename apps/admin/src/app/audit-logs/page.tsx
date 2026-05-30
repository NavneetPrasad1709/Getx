'use client';

import { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ScrollText,
  Search,
  ShieldAlert,
} from 'lucide-react';
import { Input, Skeleton, motion } from '@getx/ui';
import { AdminShell } from '@/components/admin-shell';
import { useAdminAuditLogs } from '@/hooks/use-admin';
import { useDebounce } from '@/hooks/use-debounce';
import { PaginationButton } from '@/components/ui/pagination-button';

// SAP-009: partial IP masking — last two octets hidden to limit PII exposure
function maskIp(ip: string | null): string {
  if (!ip) return '—';
  const v4 = ip.split('.');
  if (v4.length === 4) return `${v4[0]}.${v4[1]}.*.*`;
  // IPv6 — hide last two groups
  const v6 = ip.split(':');
  if (v6.length >= 2) return `${v6.slice(0, -2).join(':')}:****`;
  return ip;
}

/* GETX Admin — Audit logs.
   ─────────────────────────────────────────────────────────────────────
   Severity-coloured stream. Filter by severity (pill row), action
   keyword (search), and userId (advanced input). Each row shows:
   severity icon · action · entity:tail · user:tail · IP · time. */

const EASE = [0.22, 1, 0.36, 1] as const;

const SEVERITIES = [
  { key: '', label: 'All' },
  { key: 'DEBUG', label: 'Debug' },
  { key: 'INFO', label: 'Info' },
  { key: 'WARNING', label: 'Warning' },
  { key: 'ERROR', label: 'Error' },
  { key: 'CRITICAL', label: 'Critical' },
] as const;

interface AuditLogRow {
  id: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  userId: string | null;
  ipAddress: string | null;
  severity: string;
  createdAt: string;
}

const SEVERITY_META: Record<
  string,
  { bg: string; fg: string; stripe: string; icon: typeof Activity }
> = {
  DEBUG: { bg: 'bg-muted/30', fg: 'text-muted-foreground', stripe: 'bg-muted/60', icon: Activity },
  INFO: { bg: 'bg-primary/12', fg: 'text-primary', stripe: 'bg-primary', icon: Activity },
  WARNING: { bg: 'bg-warning/12', fg: 'text-warning', stripe: 'bg-warning', icon: AlertTriangle },
  ERROR: { bg: 'bg-error/12', fg: 'text-error', stripe: 'bg-error', icon: AlertTriangle },
  CRITICAL: { bg: 'bg-error/20', fg: 'text-error', stripe: 'bg-error', icon: ShieldAlert },
};

export default function AdminAuditLogsPage() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [userIdFilter, setUserIdFilter] = useState('');

  // SAP-004 / SAP-005: debounce text fields — API fires only when user pauses
  const debouncedAction = useDebounce(actionFilter);
  const debouncedUserId = useDebounce(userIdFilter);
  useEffect(() => { setPage(1); }, [debouncedAction, debouncedUserId]);

  const { data, isLoading } = useAdminAuditLogs({
    page,
    action: debouncedAction || undefined,
    severity: severityFilter || undefined,
    userId: debouncedUserId || undefined,
  });

  const rows = (data?.data ?? []) as AuditLogRow[];
  const totalPages = data?.pagination.totalPages ?? 1;
  const total = data?.pagination.total ?? 0;

  return (
    <AdminShell>
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
        className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-7xl mx-auto space-y-5 lg:space-y-6"
      >
        <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } } }}>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary font-bold mb-1.5">
              System · audit
            </div>
            <h1 className="font-display text-3xl lg:text-4xl font-extrabold tracking-tight">
              Audit logs
            </h1>
            <p className="text-[13.5px] text-muted-foreground mt-1">
              Every privileged action recorded. Filter by severity, action, or user.
            </p>
          </div>
        </motion.div>

        <motion.div
          variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } } }}
          className="sticky top-0 z-10 -mx-4 sm:-mx-6 lg:-mx-10 px-4 sm:px-6 lg:px-10 py-3 bg-background/85 backdrop-blur-xl border-b border-border space-y-2"
        >
          <div className="flex items-center gap-1.5 overflow-x-auto -mx-1 px-1 pb-0.5">
            {SEVERITIES.map((s) => {
              const active = severityFilter === s.key;
              return (
                <motion.button
                  key={s.key || 'all'}
                  type="button"
                  onClick={() => {
                    setSeverityFilter(s.key);
                    setPage(1);
                  }}
                  whileTap={{ scale: 0.95 }}
                  className={`
                    relative inline-flex items-center h-9 px-3.5 rounded-full text-[12.5px] font-semibold whitespace-nowrap transition-colors
                    ${active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}
                  `}
                >
                  {active && (
                    <motion.span
                      layoutId="admin-audit-pill"
                      className="absolute inset-0 -z-10 rounded-full bg-surface ring-1 ring-border shadow-[0_4px_12px_-4px_hsl(var(--foreground)/0.15)]"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  )}
                  {s.label}
                </motion.button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                placeholder="Action contains…  (e.g., ORDER_REFUND)"
                className="w-full h-9 pl-9 pr-3 rounded-full bg-muted/25 ring-1 ring-transparent focus:bg-surface focus:ring-primary/35 text-[13px] outline-none transition-all"
              />
            </div>
            <Input
              placeholder="User ID"
              value={userIdFilter}
              onChange={(e) => setUserIdFilter(e.target.value)}
              className="h-9 w-full sm:w-56 rounded-full text-[12.5px]"
            />
          </div>
        </motion.div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="rounded-2xl bg-surface ring-1 ring-border overflow-hidden">
            <ul className="divide-y divide-border">
              {rows.map((log, idx) => (
                <motion.li
                  key={log.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(idx, 8) * 0.025, duration: 0.3, ease: EASE }}
                >
                  <AuditRow log={log} />
                </motion.li>
              ))}
            </ul>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
            <span className="font-mono text-[11px] text-muted-foreground">
              Page <span className="text-foreground font-bold tabular-nums">{page}</span> of{' '}
              <span className="text-foreground font-bold tabular-nums">{totalPages}</span> ·{' '}
              {total.toLocaleString('en-US')} total
            </span>
            <div className="flex items-center gap-2">
              <PaginationButton disabled={page <= 1} onClick={() => setPage(page - 1)} dir="prev" />
              <PaginationButton
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                dir="next"
              />
            </div>
          </div>
        )}
      </motion.div>
    </AdminShell>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  AUDIT ROW                                                           */
/* ══════════════════════════════════════════════════════════════════ */
function AuditRow({ log }: { log: AuditLogRow }) {
  const meta = SEVERITY_META[log.severity] ?? SEVERITY_META.INFO;
  const Icon = meta.icon;
  return (
    <div className="relative flex items-center gap-3 sm:gap-4 p-3.5 sm:p-4 pl-5 hover:bg-muted/15 transition-colors">
      <div aria-hidden className={`absolute left-0 top-0 bottom-0 w-[3px] ${meta.stripe}`} />
      <div className={`grid place-items-center h-9 w-9 rounded-xl shrink-0 ${meta.bg} ${meta.fg}`}>
        <Icon className="h-4 w-4" strokeWidth={2.25} />
      </div>
      <div className="flex-1 min-w-0 grid grid-cols-1 lg:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-center">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span
              className={`font-mono text-[9.5px] uppercase tracking-[0.18em] font-bold ${meta.fg}`}
            >
              {log.severity}
            </span>
            <span className="font-mono text-[12px] text-foreground truncate">{log.action}</span>
          </div>
          <div className="text-[11px] text-muted-foreground truncate">
            {log.entity ? (
              <>
                {log.entity}
                {log.entityId && (
                  <span className="font-mono opacity-75 ml-1">:{log.entityId.slice(-8)}</span>
                )}
              </>
            ) : (
              'System event'
            )}
          </div>
        </div>
        <div className="text-[11px] hidden lg:block">
          <div className="font-mono uppercase tracking-[0.18em] text-muted-foreground font-bold mb-0.5">
            User
          </div>
          <div className="font-mono text-foreground truncate">
            {log.userId ? log.userId.slice(-12) : '—'}
          </div>
        </div>
        <div className="text-[11px] hidden lg:block">
          <div className="font-mono uppercase tracking-[0.18em] text-muted-foreground font-bold mb-0.5">
            IP
          </div>
          {/* SAP-009: last two octets masked */}
          <div className="font-mono text-foreground truncate">{maskIp(log.ipAddress)}</div>
        </div>
        <div className="font-mono text-[10.5px] text-muted-foreground tabular-nums shrink-0 text-right">
          {new Date(log.createdAt).toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl bg-surface ring-1 ring-border p-12 text-center">
      <div className="grid place-items-center h-12 w-12 rounded-full bg-muted/30 text-muted-foreground mx-auto mb-3">
        <ScrollText className="h-5 w-5" />
      </div>
      <div className="font-display font-bold text-[15px] mb-1">No audit entries match</div>
      <div className="text-[13px] text-muted-foreground">Loosen the filters.</div>
    </div>
  );
}
