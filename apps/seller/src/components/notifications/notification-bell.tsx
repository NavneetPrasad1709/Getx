'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Bell, CheckCheck } from 'lucide-react';
import { Card } from '@getx/ui';
import { useAuth } from '@/hooks/use-auth';
import {
  useMarkAllRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadCount,
  type NotificationItem,
  type NotificationType,
} from '@/hooks/use-notifications';

/* The seller bell only surfaces seller-facing notifications — new buyer
   request matches (boosting requests), the seller's own offer outcomes,
   order lifecycle updates, and payout/withdrawal events. Buyer-side
   noise (OFFER_RECEIVED, REQUEST_NEW_OFFER, NEW_MESSAGE, reviews, etc.)
   is filtered out server-side via the ?types= param. Module-level so the
   reference is stable across renders (keeps the react-query key stable). */
const SELLER_NOTIFICATION_TYPES: readonly NotificationType[] = [
  'REQUEST_NEW_MATCH',
  'OFFER_ACCEPTED',
  'OFFER_REJECTED',
  'ORDER_PAID',
  'ORDER_IN_PROGRESS',
  'ORDER_DELIVERED',
  'ORDER_CONFIRMED',
  'ORDER_COMPLETED',
  'ORDER_CANCELLED',
  'PAYMENT_DISPUTED',
  'WITHDRAWAL_REQUESTED',
  'WITHDRAWAL_APPROVED',
  'WITHDRAWAL_PROCESSED',
  'WITHDRAWAL_FAILED',
  'DISPUTE_OPENED',
  'DISPUTE_RESPONSE',
  'DISPUTE_RESOLVED',
];

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
  const { data: notifs } = useNotifications(isAuthenticated && open, SELLER_NOTIFICATION_TYPES);
  const unreadCount = useUnreadCount(isAuthenticated, SELLER_NOTIFICATION_TYPES).data ?? 0;
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

  const webUrl = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative grid place-items-center h-10 w-10 rounded-full text-foreground/75 hover:text-foreground hover:bg-muted/30 transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="h-[18px] w-[18px]" strokeWidth={2} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center ring-2 ring-surface tabular-nums">
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
          <Card className="absolute right-0 top-12 w-96 max-w-[95vw] z-40 max-h-[500px] flex flex-col shadow-[0_24px_60px_-20px_hsl(0_0%_0%/0.25)] border-border rounded-2xl overflow-hidden">
            <div className="p-3 border-b border-border flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Bell className="h-3.5 w-3.5 text-primary" strokeWidth={2.5} />
                <h3 className="font-semibold text-[13.5px]">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center h-4 min-w-5 px-1 rounded-full bg-primary/15 text-primary font-mono text-[10px] font-bold tabular-nums">
                    {unreadCount}
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAll.mutate()}
                  disabled={markAll.isPending}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary-hover disabled:opacity-50 transition-colors"
                >
                  <CheckCheck className="h-3 w-3" strokeWidth={2.5} />
                  Mark all read
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {!notifs ? (
                <p className="text-center text-xs text-muted-foreground py-10">Loading…</p>
              ) : notifs.data.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <div className="grid place-items-center h-10 w-10 rounded-full bg-muted/30 text-muted-foreground mx-auto mb-2">
                    <Bell className="h-4 w-4" />
                  </div>
                  <div className="text-[13px] font-semibold mb-0.5">All caught up</div>
                  <div className="text-[11.5px] text-muted-foreground">
                    Request matches, offer, order, and payout alerts land here.
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {notifs.data.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => handleClick(n)}
                      className={`w-full text-left p-3 hover:bg-muted/25 transition-colors ${
                        !n.read ? 'bg-primary/5' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {!n.read ? (
                          <span className="h-2 w-2 rounded-full bg-primary mt-1.5 flex-shrink-0 shadow-[0_0_8px_hsl(var(--primary))]" />
                        ) : (
                          <span className="h-2 w-2 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-[13px] leading-snug">{n.title}</div>
                          {n.message && (
                            <div className="text-[11.5px] text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
                              {n.message}
                            </div>
                          )}
                          <div className="text-[10.5px] text-muted-foreground/80 mt-1 font-mono">
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
              <div className="border-t border-border">
                <a
                  href={`${webUrl}/profile/notifications`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1 p-2.5 text-[11.5px] font-semibold text-primary hover:bg-muted/20 transition-colors"
                  onClick={() => setOpen(false)}
                >
                  View all on getx.live
                  <ArrowUpRight className="h-3 w-3" />
                </a>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
