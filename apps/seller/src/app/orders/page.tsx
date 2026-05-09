'use client';

import Link from 'next/link';
import { Badge, Button, Card, CardContent, Skeleton } from '@getx/ui';
import { SellerShell } from '@/components/seller-shell';
import { useMySellerOrders, type SellerOrderListItem } from '@/hooks/use-seller-orders';

function rowTitle(order: SellerOrderListItem): string {
  return (
    order.customRequest?.title ??
    order.paymentMetadata?.snapshotTitle ??
    `Order ${order.orderNumber}`
  );
}

export default function OrdersPage() {
  const { data: orders, isLoading } = useMySellerOrders();

  return (
    <SellerShell>
      <div className="container max-w-5xl py-8">
        <h1 className="font-display text-3xl font-bold mb-2">Orders</h1>
        <p className="text-muted-foreground mb-6">Manage incoming orders and deliver to buyers.</p>

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
              <p className="text-muted-foreground mb-4">
                Active listings + accepted offers will appear here when buyers purchase.
              </p>
              <Link href="/listings">
                <Button variant="outline">Manage listings</Button>
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
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs text-muted-foreground font-mono">
                            {order.orderNumber}
                          </span>
                          <Badge variant="secondary">{order.status.replace('_', ' ')}</Badge>
                        </div>
                        <h3 className="font-medium truncate">{rowTitle(order)}</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Buyer: {order.buyer.username ?? order.buyer.name ?? '—'}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xl font-display font-bold text-primary">
                          ${order.buyerTotal.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          You earn ${order.sellerAmount.toFixed(2)}
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
    </SellerShell>
  );
}
