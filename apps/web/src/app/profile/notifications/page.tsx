'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Skeleton, motion, useReducedMotion } from '@getx/ui';
import { Bell, Check, Inbox, Sparkles } from 'lucide-react';
import { Header } from '@/components/header';
import { LandingFooter } from '@/components/landing/landing-footer';
import { useAuth } from '@/hooks/use-auth';
import {
  useMarkAllRead,
  useMarkNotificationRead,
  useNotifications,
  type NotificationItem,
} from '@/hooks/use-notifications';
import {
  NotificationIcon,
  getNotificationGroup,
  type NotificationGroup,
} from '@/components/notifications/notification-icon';

/* /profile/notifications — full inbox.

   Filter chips group by domain (orders, offers, messages, reviews, payouts,
   system). Selecting one filter narrows the list inline without a route hop.
   Notifications themselves use the same icon registry as the bell, so the
   visual language is consistent across surfaces. */

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

const GROUPS: Array<{ id: NotificationGroup | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'orders', label: 'Orders' },
  { id: 'offers', label: 'Offers' },
  { id: 'messages', label: 'Messages' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'payouts', label: 'Payouts' },
  { id: 'system', label: 'System' },
];

export default function NotificationsPage() {
  const reduce = useReducedMotion();
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const { data: notifs, isLoading } = useNotifications(isAuthenticated);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllRead();

  const [group, setGroup] = useState<NotificationGroup | 'all'>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login?next=/profile/notifications');
    }
  }, [loading, isAuthenticated, router]);

  const filtered = useMemo(() => {
    const list = notifs?.data ?? [];
    return list.filter((n) => {
      if (showUnreadOnly && n.read) return false;
      if (group !== 'all' && getNotificationGroup(n.type) !== group) return false;
      return true;
    });
  }, [notifs, group, showUnreadOnly]);

  // Per-group counts power the chips with little tally badges.
  const groupCounts = useMemo(() => {
    const counts: Partial<Record<NotificationGroup | 'all', number>> = {};
    const list = notifs?.data ?? [];
    counts.all = list.length;
    for (const n of list) {
      const g = getNotificationGroup(n.type);
      counts[g] = (counts[g] ?? 0) + 1;
    }
    return counts;
  }, [notifs]);

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="container py-24 flex-1">
          <Skeleton className="h-96 rounded-3xl" />
        </main>
        <LandingFooter />
      </div>
    );
  }

  const handleClick = (n: NotificationItem) => {
    if (!n.read) markRead.mutate(n.id);
    if (n.link) router.push(n.link);
  };

  const unreadCount = notifs?.unreadCount ?? 0;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="container py-12 md:py-20 flex-1 max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary mb-2">
              Profile · Inbox
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
              Notifications
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {unreadCount > 0
                ? `${unreadCount} unread · stay on top of orders, offers and messages`
                : 'You’re all caught up.'}
            </p>
          </div>
          {unreadCount > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAll.mutate()}
              loading={markAll.isPending}
              loadingText="Marking…"
              className="rounded-full"
            >
              <Check className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          ) : null}
        </div>

        {/* Filters */}
        <div className="mb-6 flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {GROUPS.map((g) => {
              const count = groupCounts[g.id] ?? 0;
              const active = group === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGroup(g.id)}
                  className={`group inline-flex items-center gap-1.5 h-8 px-3 rounded-full font-mono text-[11px] uppercase tracking-wider transition-colors duration-ui ease-apple ${
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-surface/60 text-muted-foreground border border-border/60 hover:border-primary/40 hover:text-foreground'
                  }`}
                >
                  {g.label}
                  {count > 0 ? (
                    <span
                      className={`tabular-nums text-[10px] px-1.5 rounded-full ${
                        active
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : 'bg-surface-elevated text-muted-foreground'
                      }`}
                    >
                      {count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="ml-auto inline-flex items-center gap-2">
            <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={showUnreadOnly}
                onChange={(e) => setShowUnreadOnly(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-border accent-primary"
              />
              <span className="text-muted-foreground">Unread only</span>
            </label>
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState filtered={notifs && notifs.data.length > 0} />
        ) : (
          <ul className="space-y-2">
            {filtered.map((n, i) => (
              <motion.li
                key={n.id}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(i, 8) * 0.03, ease: [0.22, 1, 0.36, 1] }}
              >
                <button
                  type="button"
                  onClick={() => handleClick(n)}
                  className={`group w-full text-left rounded-2xl border p-4 transition-all duration-ui ease-apple hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_18px_40px_-20px_hsl(var(--primary-glow)/0.4)] ${
                    !n.read
                      ? 'border-primary/30 bg-primary/[0.04]'
                      : 'border-border/60 bg-surface/60'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <NotificationIcon type={n.type} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className={`font-display text-base leading-snug ${!n.read ? 'font-semibold' : ''}`}>
                          {n.title}
                        </div>
                        {!n.read ? (
                          <span
                            aria-hidden
                            className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.8)]"
                          />
                        ) : null}
                      </div>
                      {n.message ? (
                        <p className="text-sm text-muted-foreground leading-relaxed mt-1">
                          {n.message}
                        </p>
                      ) : null}
                      <div className="flex items-center gap-2 mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/80">
                        <span>{timeAgo(n.createdAt)}</span>
                        {n.link ? (
                          <>
                            <span aria-hidden>·</span>
                            <span className="text-primary group-hover:underline">View</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </button>
              </motion.li>
            ))}
          </ul>
        )}
      </main>
      <LandingFooter />
    </div>
  );
}

function EmptyState({ filtered }: { filtered?: boolean }) {
  return (
    <div className="surface-cinematic rounded-3xl py-16 px-6 text-center">
      <div className="h-14 w-14 mx-auto mb-5 rounded-2xl bg-primary/10 grid place-items-center text-primary">
        {filtered ? <Inbox className="h-6 w-6" /> : <Bell className="h-6 w-6" />}
      </div>
      <h2 className="font-display text-2xl font-bold mb-2">
        {filtered ? 'Nothing here yet' : 'No notifications yet'}
      </h2>
      <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
        {filtered
          ? 'Try a different filter, or come back when there’s fresh activity.'
          : 'Activity on your orders, offers, and reviews will land here in real time.'}
      </p>
      <Link href="/games">
        <Button size="lg" className="rounded-full">
          <Sparkles className="h-4 w-4" />
          Browse marketplace
        </Button>
      </Link>
    </div>
  );
}
