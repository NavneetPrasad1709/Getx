'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card, CardContent, Skeleton } from '@getx/ui';
import { AdminShell } from '@/components/admin-shell';
import { useAdminOrders } from '@/hooks/use-admin';

interface OrderRow {
  id: string;
  orderNumber: string;
  status: string;
  buyerTotal: number;
  createdAt: string;
  buyer: { username: string | null; name: string | null };
  seller: { username: string | null; name: string | null };
}

const ORDER_STATUSES = [
  'PENDING',
  'PAID',
  'IN_PROGRESS',
  'DELIVERED',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
  'DISPUTED',
  'REFUNDED',
] as const;

export default function AdminOrdersPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const { data, isLoading } = useAdminOrders({
    page,
    status: statusFilter,
  });

  return (
    <AdminShell>
      <div className="container max-w-7xl py-8">
        <h1 className="font-display text-3xl font-bold mb-6">Orders</h1>

        <Card className="mb-6">
          <CardContent className="p-4 flex flex-wrap gap-3">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All statuses</option>
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ')}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        {isLoading ? (
          <Skeleton className="h-96" />
        ) : !data || data.data.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              No orders found
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30">
                  <tr>
                    <th className="text-left p-3">Order</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Buyer</th>
                    <th className="text-left p-3">Seller</th>
                    <th className="text-right p-3">Total</th>
                    <th className="text-left p-3">Created</th>
                    <th className="text-left p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {(data.data as OrderRow[]).map((order) => (
                    <tr key={order.id} className="border-b hover:bg-muted/20 last:border-b-0">
                      <td className="p-3 font-mono text-xs">{order.orderNumber}</td>
                      <td className="p-3">
                        <Badge variant="secondary">{order.status.replace('_', ' ')}</Badge>
                      </td>
                      <td className="p-3">{order.buyer.username ?? order.buyer.name ?? '—'}</td>
                      <td className="p-3">{order.seller.username ?? order.seller.name ?? '—'}</td>
                      <td className="p-3 text-right font-mono">${order.buyerTotal.toFixed(2)}</td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <Link href={`/orders/${order.id}`}>
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {data && data.pagination.totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6 items-center">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {page} of {data.pagination.totalPages} · {data.pagination.total} total
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.pagination.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
