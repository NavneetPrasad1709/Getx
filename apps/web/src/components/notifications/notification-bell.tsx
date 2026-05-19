'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Check, Settings } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from '@getx/ui';
import { useAuth } from '@/hooks/use-auth';
import {
  useMarkAllRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadCount,
  type NotificationItem,
} from '@/hooks/use-notifications';
import { NotificationIcon } from './notification-icon';

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

/* NotificationBell — header dropdown.

   Surface choices:
   - Pulse ring on the bell when there are unread items (subtle, not noisy).
   - Cinematic surface for the panel — same vocabulary as the order page.
   - Pre-fetches notifications on hover so the panel feels instant on click. */

export function NotificationBell() {
  const reduce = useReducedMotion();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  // Fetch lazily but warm the cache on hover so opening feels instant.
  const { data: notifs } = useNotifications(isAuthenticated && (open || hovered));
  const unreadCount = useUnreadCount(isAuthenticated).data ?? 0;
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllRead();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!isAuthenticated) return null;

  const handleClick = (n: NotificationItem) => {
    if (!n.read) markRead.mutate(n.id);
    setOpen(false);
    if (n.link) router.push(n.link);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-foreground/80 hover:text-primary hover:bg-primary/10 transition-all duration-ui ease-apple"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="h-[18px] w-[18px]" />
        {unreadCount > 0 ? (
          <>
            {!reduce ? (
              <span
                aria-hidden
                className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-hot animate-ping opacity-60"
              />
            ) : null}
            <span
              aria-hidden
              className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-hot shadow-[0_0_10px_hsl(var(--hot)/0.8)]"
            />
            <span className="sr-only">{unreadCount} unread</span>
          </>
        ) : null}
      </button>

      <AnimatePresence>
        {open ? (
          <>
            <button
              type="button"
              aria-label="Close notifications"
              className="fixed inset-0 z-30 cursor-default"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={reduce ? false : { opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? undefined : { opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="absolute right-0 top-12 w-[400px] max-w-[95vw] z-40 max-h-[560px] flex flex-col surface-cinematic rounded-2xl overflow-hidden shadow-[0_30px_80px_-20px_hsl(var(--primary-glow)/0.4)]"
            >
              <div className="px-4 py-3.5 border-b border-border/40 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-base font-semibold">Inbox</h3>
                  {unreadCount > 0 ? (
                    <span className="font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-hot/15 text-hot tabular-nums">
                      {unreadCount} new
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 ? (
                    <button
                      type="button"
                      onClick={() => markAll.mutate()}
                      disabled={markAll.isPending}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
                    >
                      <Check className="h-3 w-3" />
                      Mark all read
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {!notifs ? (
                  <NotificationListSkeleton />
                ) : notifs.data.length === 0 ? (
                  <EmptyInbox />
                ) : (
                  <ul className="divide-y divide-border/30">
                    {notifs.data.slice(0, 8).map((n) => (
                      <li key={n.id}>
                        <button
                          type="button"
                          onClick={() => handleClick(n)}
                          className={`group w-full text-left px-4 py-3.5 transition-colors duration-ui ease-apple hover:bg-surface-elevated/60 ${
                            !n.read ? 'bg-primary/[0.04]' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <NotificationIcon type={n.type} size="sm" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div
                                  className={`font-display text-sm leading-snug ${
                                    !n.read ? 'font-semibold text-foreground' : 'text-foreground/85'
                                  }`}
                                >
                                  {n.title}
                                </div>
                                {!n.read ? (
                                  <span
                                    aria-hidden
                                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.8)]"
                                  />
                                ) : null}
                              </div>
                              {n.message ? (
                                <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                                  {n.message}
                                </div>
                              ) : null}
                              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/80 mt-1.5">
                                {timeAgo(n.createdAt)}
                              </div>
                            </div>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="border-t border-border/40 bg-surface/40 px-2 py-2 flex items-center justify-between">
                <Link
                  href="/profile/notifications"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs text-primary hover:bg-primary/10 transition-colors"
                >
                  View all
                </Link>
                <Link
                  href="/profile/notifications"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors"
                  aria-label="Notification preferences"
                >
                  <Settings className="h-3 w-3" />
                  Preferences
                </Link>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function NotificationListSkeleton() {
  return (
    <ul className="divide-y divide-border/30">
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className="px-4 py-3.5">
          <div className="flex items-start gap-3 animate-pulse">
            <div className="h-8 w-8 rounded-xl bg-surface-elevated/60" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-4/5 rounded bg-surface-elevated/60" />
              <div className="h-2.5 w-3/5 rounded bg-surface-elevated/40" />
              <div className="h-2 w-16 rounded bg-surface-elevated/30" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function EmptyInbox() {
  return (
    <div className="py-12 px-6 text-center">
      <div className="h-12 w-12 mx-auto mb-4 rounded-2xl bg-primary/10 grid place-items-center text-primary">
        <Bell className="h-5 w-5" />
      </div>
      <div className="font-display text-base font-semibold mb-1">All caught up</div>
      <p className="text-xs text-muted-foreground">
        Order updates, offers, and messages will land here.
      </p>
    </div>
  );
}
