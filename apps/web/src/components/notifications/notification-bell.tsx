'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@getx/ui';
import { useAuth } from '@/hooks/use-auth';
import {
  useMarkAllRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadCount,
  type NotificationItem,
} from '@/hooks/use-notifications';

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

export function NotificationBell() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const { data: notifs } = useNotifications(isAuthenticated && open);
  const unreadCount = useUnreadCount(isAuthenticated).data ?? 0;
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllRead();

  // Close on outside click is handled via the backdrop overlay below.
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
        className="relative p-2 hover:bg-muted/50 rounded-md transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-error text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close notifications"
            className="fixed inset-0 z-30 cursor-default"
            onClick={() => setOpen(false)}
          />
          <Card className="absolute right-0 top-12 w-96 max-w-[95vw] z-40 max-h-[500px] flex flex-col shadow-2xl border-border">
            <div className="p-3 border-b flex items-center justify-between gap-2">
              <h3 className="font-semibold text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAll.mutate()}
                  disabled={markAll.isPending}
                  className="text-xs text-primary hover:underline disabled:opacity-50"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {!notifs ? (
                <p className="text-center text-xs text-muted-foreground py-8">Loading…</p>
              ) : notifs.data.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No notifications yet.
                </p>
              ) : (
                <div className="divide-y">
                  {notifs.data.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => handleClick(n)}
                      className={`w-full text-left p-3 hover:bg-muted/40 transition-colors ${
                        !n.read ? 'bg-primary/5' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {!n.read ? (
                          <span className="h-2 w-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                        ) : (
                          <span className="h-2 w-2 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{n.title}</div>
                          {n.message && (
                            <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                              {n.message}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground mt-1">
                            {timeAgo(n.createdAt)}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {notifs && notifs.data.length > 0 && (
              <div className="p-2 border-t text-center">
                <Link
                  href="/profile/notifications"
                  className="text-xs text-primary hover:underline"
                  onClick={() => setOpen(false)}
                >
                  View all notifications
                </Link>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function BellIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}
