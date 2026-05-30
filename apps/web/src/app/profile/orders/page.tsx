'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge, Button, Card, CardContent, Skeleton } from '@getx/ui';
import { Header } from '@/components/header';
import { LandingFooter } from '@/components/landing/landing-footer';
import { useMyOrders, type OrderListItem } from '@/hooks/use-orders';
import { useAuth } from '@/hooks/use-auth';

function rowTitle(order: OrderListItem): string {
  // WEB-HIGH-024: snapshotTitle first — it's the human label; slug is URL-encoded
  return (
    (order.paymentMetadata?.snapshotTitle as string | undefined) ??
    order.customRequest?.title ??
    order.productListing?.slug ??
    `Order ${order.orderNumber}`
  );
}

export default function MyOrdersPage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const { data: orders, isLoading } = useMyOrders('buyer');

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login?next=/profile/orders');
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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="container py-8 flex-1">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <h1 className="font-display text-3xl font-bold">My Orders</h1>
            <Link href="/profile/requests">
              <Button variant="outline">My Requests</Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : !orders || orders.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <h3 className="font-display text-xl font-semibold mb-2">No orders yet</h3>
                <p className="text-muted-foreground mb-6">
                  Browse the marketplace to make your first purchase.
                </p>
                <Link href="/games/pokemon-go">
                  <Button>Browse Pokemon GO</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <Link key={order.id} href={`/orders/${order.id}`} className="block">
                  <Card className="hover:border-primary/50 transition-colors">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between flex-wrap gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-xs text-muted-foreground font-mono">
                              {order.orderNumber}
                            </span>
                            <Badge variant="secondary">{order.status.replace('_', ' ')}</Badge>
                          </div>
                          <h3 className="font-medium truncate">{rowTitle(order)}</h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-display text-xl font-bold text-primary">
                            ${order.buyerTotal.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
