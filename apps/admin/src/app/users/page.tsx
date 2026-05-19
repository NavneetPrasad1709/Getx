'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  Ban,
  ChevronLeft,
  ChevronRight,
  Mail,
  Search,
  ShieldAlert,
  ShieldCheck,
  Star,
  UserCheck,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { Skeleton, motion } from '@getx/ui';
import { AdminShell } from '@/components/admin-shell';
import { useAdminUsers, type AdminUserRow } from '@/hooks/use-admin';

/* GETX Admin — Users.
   ─────────────────────────────────────────────────────────────────────
   Identity moderation. Search, filter by status (ACTIVE / SUSPENDED /
   BANNED) and role (BUYER / SELLER / BOTH / ADMIN). KYC level shown
   as a tinted chip per row so admins spot pending verifications fast. */

const EASE = [0.22, 1, 0.36, 1] as const;

const STATUSES = [
  { key: '', label: 'All' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'SUSPENDED', label: 'Suspended' },
  { key: 'BANNED', label: 'Banned' },
] as const;

const ROLES = [
  { key: '', label: 'Any role' },
  { key: 'BUYER', label: 'Buyer' },
  { key: 'SELLER', label: 'Seller' },
  { key: 'BOTH', label: 'Both' },
  { key: 'ADMIN', label: 'Admin' },
] as const;

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('');

  const { data, isLoading } = useAdminUsers({
    page,
    search,
    status: statusFilter || undefined,
    role: roleFilter || undefined,
  });

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
              Identity · users
            </div>
            <h1 className="font-display text-3xl lg:text-4xl font-extrabold tracking-tight">
              Users
            </h1>
            <p className="text-[13.5px] text-muted-foreground mt-1">
              Search every account, audit KYC, ban/unban on the row.
            </p>
          </div>
        </motion.div>

        {/* ── FILTER BAR ─────────────────────────────────────────────── */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } } }}
          className="sticky top-0 z-10 -mx-4 sm:-mx-6 lg:-mx-10 px-4 sm:px-6 lg:px-10 py-3 bg-background/85 backdrop-blur-xl border-b border-border"
        >
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Email, username, or name"
                className="w-full h-9 pl-9 pr-3 rounded-full bg-muted/25 ring-1 ring-transparent focus:bg-surface focus:ring-primary/35 text-[13px] outline-none transition-all"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto -mx-1 px-1 pb-0.5">
              {STATUSES.map((s) => {
                const active = statusFilter === s.key;
                return (
                  <motion.button
                    key={s.key || 'all'}
                    type="button"
                    onClick={() => {
                      setStatusFilter(s.key);
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
                        layoutId="admin-users-pill"
                        className="absolute inset-0 -z-10 rounded-full bg-surface ring-1 ring-border shadow-[0_4px_12px_-4px_hsl(var(--foreground)/0.15)]"
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      />
                    )}
                    {s.label}
                  </motion.button>
                );
              })}
            </div>

            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 rounded-full bg-muted/25 ring-1 ring-transparent focus:bg-surface focus:ring-primary/35 px-3.5 text-[12.5px] font-semibold outline-none transition-all"
            >
              {ROLES.map((r) => (
                <option key={r.key || 'any'} value={r.key}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </motion.div>

        {/* ── BODY ───────────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
        ) : !data || data.data.length === 0 ? (
          <EmptyState query={search} />
        ) : (
          <div className="space-y-2.5">
            {data.data.map((user, idx) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03, duration: 0.3, ease: EASE }}
              >
                <UserRow user={user} />
              </motion.div>
            ))}
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
/*  USER ROW                                                            */
/* ══════════════════════════════════════════════════════════════════ */
function UserRow({ user }: { user: AdminUserRow }) {
  const initial = (user.username ?? user.name ?? user.email).slice(0, 2).toUpperCase();
  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : '—';
  const banned = user.status === 'BANNED';
  const suspended = user.status === 'SUSPENDED';

  return (
    <Link
      href={`/users/${user.id}`}
      className={`
        group relative block rounded-2xl bg-surface ring-1 overflow-hidden transition-all
        ${banned ? 'ring-error/30 hover:ring-error/50' : suspended ? 'ring-warning/30 hover:ring-warning/50' : 'ring-border hover:ring-foreground/20'}
        hover:shadow-[0_14px_36px_-22px_hsl(var(--foreground)/0.22)]
      `}
    >
      <div className="flex items-center gap-3 sm:gap-4 p-4">
        <div className="grid place-items-center h-11 w-11 rounded-xl bg-gradient-to-br from-primary/30 to-accent/30 text-foreground font-bold text-[12px] shrink-0 ring-2 ring-surface">
          {initial}
        </div>
        <div className="flex-1 min-w-0 grid grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_auto] gap-3 items-center">
          <div className="min-w-0">
            <div className="font-semibold text-[14px] truncate">
              {user.username ? `@${user.username}` : user.name ?? 'No name'}
            </div>
            <div className="text-[11.5px] text-muted-foreground truncate flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {user.email}
            </div>
            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
              <StatusPill status={user.status} />
              <KycPill level={user.kycLevel} />
              {user.emailVerified && (
                <span className="inline-flex items-center gap-1 text-[9.5px] font-mono uppercase tracking-[0.18em] text-success font-bold">
                  <BadgeCheck className="h-2.5 w-2.5" strokeWidth={2.5} />
                  Email
                </span>
              )}
            </div>
          </div>

          <div className="text-[12px] hidden lg:block">
            <div className="flex items-center gap-2 mb-1">
              <RoleChip role={user.role} />
              {user.isSeller && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-mono text-[9.5px] uppercase tracking-[0.18em] font-bold">
                  Seller
                </span>
              )}
            </div>
            {user.isSeller && (
              <div className="text-muted-foreground flex items-center gap-1">
                <Star className="h-3 w-3 fill-accent text-accent" />
                <span className="tabular-nums font-semibold text-foreground">
                  {user.sellerRating.toFixed(2)}
                </span>
                <span>·</span>
                <span className="tabular-nums">{user.totalSales}</span> sales
              </div>
            )}
          </div>

          <div className="text-right lg:text-left">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-bold">
              Joined
            </div>
            <div className="font-display font-bold text-[13px] mt-0.5">{memberSince}</div>
          </div>

          <div className="hidden lg:flex items-center justify-end">
            <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary group-hover:gap-2 transition-all">
              View
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  CHIPS                                                               */
/* ══════════════════════════════════════════════════════════════════ */
function StatusPill({ status }: { status: string }) {
  const meta: Record<string, { bg: string; icon: typeof UserCheck }> = {
    ACTIVE: { bg: 'bg-success/15 text-success ring-success/25', icon: UserCheck },
    SUSPENDED: { bg: 'bg-warning/15 text-warning ring-warning/25', icon: ShieldAlert },
    BANNED: { bg: 'bg-error/15 text-error ring-error/25', icon: Ban },
  };
  const m = meta[status] ?? meta.ACTIVE;
  const Icon = m.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full ring-1 ${m.bg} font-mono text-[9.5px] uppercase tracking-[0.18em] font-bold`}
    >
      <Icon className="h-2.5 w-2.5" strokeWidth={2.5} />
      {status}
    </span>
  );
}

function RoleChip({ role }: { role: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted/30 ring-1 ring-border font-mono text-[9.5px] uppercase tracking-[0.18em] text-foreground/80 font-bold">
      {role}
    </span>
  );
}

function KycPill({ level }: { level: string }) {
  if (!level || level === 'NONE') {
    return (
      <span className="inline-flex items-center gap-1 text-[9.5px] font-mono uppercase tracking-[0.18em] text-muted-foreground font-bold">
        <ShieldAlert className="h-2.5 w-2.5" strokeWidth={2.5} />
        No KYC
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-mono text-[9.5px] uppercase tracking-[0.18em] font-bold">
      <ShieldCheck className="h-2.5 w-2.5" strokeWidth={2.5} />
      KYC {level}
    </span>
  );
}

function PaginationButton({
  disabled,
  onClick,
  dir,
}: {
  disabled: boolean;
  onClick: () => void;
  dir: 'prev' | 'next';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center gap-1 h-9 px-3.5 rounded-full text-[12.5px] font-semibold transition-colors
        ${
          disabled
            ? 'bg-muted/15 text-muted-foreground/50 cursor-not-allowed'
            : 'bg-muted/25 hover:bg-muted/40 ring-1 ring-border text-foreground'
        }
      `}
    >
      {dir === 'prev' ? (
        <>
          <ChevronLeft className="h-3.5 w-3.5" />
          Previous
        </>
      ) : (
        <>
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </>
      )}
    </button>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="rounded-3xl bg-surface ring-1 ring-border p-12 text-center">
      <div className="grid place-items-center h-12 w-12 rounded-full bg-muted/30 text-muted-foreground mx-auto mb-3">
        {query.trim() ? <Search className="h-5 w-5" /> : <UsersRound className="h-5 w-5" />}
      </div>
      <div className="font-display font-bold text-[15px] mb-1">
        {query.trim() ? `No matches for "${query}"` : 'No users match'}
      </div>
      <div className="text-[13px] text-muted-foreground">Adjust filters or search.</div>
    </div>
  );
}

void UserRound; // reserved for future use
