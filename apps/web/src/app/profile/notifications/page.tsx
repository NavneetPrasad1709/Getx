'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Card, CardContent, Skeleton } from '@getx/ui';
import { Header } from '@/components/header';
import { LandingFooter } from '@/components/landing/landing-footer';
import { useAuth } from '@/hooks/use-auth';
import {
  useMarkAllRead,
  useMarkNotificationRead,
  useNotifications,
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

export default function NotificationsPage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const { data: notifs, isLoading } = useNotifications(isAuthenticated);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllRead();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login?next=/profile/notifications');
    }
  }, [loading, isAuthenticated, router]);

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="container py-8 flex-1">
          <Skeleton className="h-96" />
        </main>
        <LandingFooter />
      </div>
    );
  }

  const handleClick = (n: NotificationItem) => {
    if (!n.read) markRead.mutate(n.id);
    if (n.link) router.push(n.link);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="container py-8 flex-1 max-w-3xl">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="font-display text-3xl font-bold">Notifications</h1>
          {notifs && notifs.unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
            >
              Mark all as read
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : !notifs || notifs.data.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <h3 className="font-display text-xl font-semibold mb-2">No notifications yet</h3>
              <p className="text-muted-foreground mb-6">
                Activity on your orders, offers, and reviews will show up here.
              </p>
              <Link href="/games">
                <Button>Browse marketplace</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {notifs.data.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => handleClick(n)}
                className={`w-full text-left rounded-lg border p-4 transition-colors hover:border-primary/50 ${
                  !n.read ? 'bg-primary/5 border-primary/20' : 'bg-card'
                }`}
              >
                <div className="flex items-start gap-3">
                  {!n.read && (
                    <span className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                  )}
                  <div className={`flex-1 min-w-0 ${n.read ? 'pl-5' : ''}`}>
                    <div className="font-medium">{n.title}</div>
                    {n.message && <p className="text-sm text-muted-foreground mt-1">{n.message}</p>}
                    <div className="text-xs text-muted-foreground mt-2">{timeAgo(n.createdAt)}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
      <LandingFooter />
    </div>
  );
}
