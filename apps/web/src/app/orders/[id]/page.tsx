'use client';

import { useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AxiosError } from 'axios';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Skeleton, toast } from '@getx/ui';
import { Header } from '@/components/header';
import { LandingFooter } from '@/components/landing/landing-footer';
import {
  useConfirmReceipt,
  useCreateCheckout,
  useOrder,
  type OrderDetail,
  type OrderStatus,
} from '@/hooks/use-orders';
import { useAuth } from '@/hooks/use-auth';
import { ChatButton } from '@/components/chat/chat-button';

const STATUS_INFO: Record<
  OrderStatus,
  { color: string; message: string; variant: 'default' | 'secondary' }
> = {
  PENDING: {
    color: 'border-warning/30 bg-warning/10',
    message: 'Awaiting payment.',
    variant: 'default',
  },
  PAID: {
    color: 'border-info/30 bg-info/10',
    message: 'Payment received. Seller is preparing your order.',
    variant: 'default',
  },
  IN_PROGRESS: {
    color: 'border-info/30 bg-info/10',
    message: 'Order in progress.',
    variant: 'default',
  },
  DELIVERED: {
    color: 'border-success/30 bg-success/10',
    message: 'Delivered. Please confirm receipt.',
    variant: 'default',
  },
  CONFIRMED: {
    color: 'border-success/30 bg-success/10',
    message: 'Receipt confirmed.',
    variant: 'default',
  },
  COMPLETED: {
    color: 'border-success/30 bg-success/10',
    message: 'Order completed. Funds released to seller.',
    variant: 'default',
  },
  CANCELLED: {
    color: 'border-muted/30 bg-muted/10',
    message: 'Order cancelled.',
    variant: 'secondary',
  },
  DISPUTED: {
    color: 'border-error/30 bg-error/10',
    message: 'Order disputed.',
    variant: 'secondary',
  },
  REFUNDED: {
    color: 'border-muted/30 bg-muted/10',
    message: 'Order refunded.',
    variant: 'secondary',
  },
};

function extractMessage(err: unknown): string | null {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { message?: string } | undefined;
    return data?.message ?? null;
  }
  return null;
}

function snapshotTitle(order: OrderDetail): string {
  const fromListing = order.productListing?.title;
  const fromRequest = order.customRequest?.title;
  const fromMeta = order.paymentMetadata?.snapshotTitle;
  return fromListing ?? fromRequest ?? fromMeta ?? `Order ${order.orderNumber}`;
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const id = params.id;
  const { user } = useAuth();

  const { data: order, isLoading, refetch } = useOrder(id);
  const createCheckout = useCreateCheckout();
  const confirmReceipt = useConfirmReceipt();

  useEffect(() => {
    const status = searchParams.get('payment');
    if (status === 'success') {
      toast.success('Payment received! Your order is being processed.');
      void refetch();
    } else if (status === 'cancelled') {
      toast.error('Payment cancelled');
    }
  }, [searchParams, refetch]);

  const handlePay = async () => {
    try {
      const session = await createCheckout.mutateAsync(id);
      window.location.href = session.checkoutUrl;
    } catch (err) {
      toast.error(extractMessage(err) ?? 'Failed to create checkout');
    }
  };

  const handleConfirmReceipt = async () => {
    if (!confirm('Confirm you received what was promised? This releases payment to seller.'))
      return;
    try {
      await confirmReceipt.mutateAsync(id);
      toast.success('Receipt confirmed. Thank you!');
    } catch (err) {
      toast.error(extractMessage(err) ?? 'Failed to confirm');
    }
  };

  if (isLoading) {
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

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="container py-12 flex-1">
          <Card>
            <CardContent className="p-12 text-center">
              <h1 className="font-display text-2xl font-bold mb-2">Order not found</h1>
              <Link href="/profile/orders">
                <Button>My Orders</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        <LandingFooter />
      </div>
    );
  }

  const isBuyer = user?.id === order.buyer.id;
  const counterparty = isBuyer ? order.seller : order.buyer;
  const statusInfo = STATUS_INFO[order.status];
  const title = snapshotTitle(order);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="container py-8 flex-1 max-w-4xl">
        <div className={`rounded-lg border p-4 mb-6 ${statusInfo.color}`}>
          <Badge variant={statusInfo.variant} className="mb-2">
            {order.status.replace('_', ' ')}
          </Badge>
          <p className="text-sm">{statusInfo.message}</p>
        </div>

        <div className="mb-6">
          <div className="text-sm text-muted-foreground font-mono mb-1">{order.orderNumber}</div>
          <h1 className="font-display text-2xl font-bold">{title}</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Order Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <Timeline order={order} />
              </CardContent>
            </Card>

            {(order.status === 'DELIVERED' || order.status === 'COMPLETED') &&
              order.deliveryProof && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Delivery Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {order.deliveryProof.notes && (
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                          Notes from seller
                        </div>
                        <p className="text-sm whitespace-pre-line">{order.deliveryProof.notes}</p>
                      </div>
                    )}
                    {order.deliveryProof.images.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {order.deliveryProof.images.map((url, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={i}
                            src={url}
                            alt={`Proof ${i + 1}`}
                            className="rounded-md aspect-square object-cover"
                          />
                        ))}
                      </div>
                    )}
                    {isBuyer && order.deliveryProof.credentials && (
                      <div className="p-4 bg-muted/30 rounded-md">
                        <div className="text-sm font-medium mb-2">Account Credentials</div>
                        <div className="space-y-1 font-mono text-sm">
                          <div>Username: {order.deliveryProof.credentials.username}</div>
                          <div>Password: {order.deliveryProof.credentials.password}</div>
                          {order.deliveryProof.credentials.extra && (
                            <div className="text-xs text-muted-foreground mt-2">
                              {order.deliveryProof.credentials.extra}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
          </div>

          <div className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-3">Pricing</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>${order.amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Service fee (8%)</span>
                    <span>${order.buyerFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold pt-2 border-t">
                    <span>Total</span>
                    <span>${order.buyerTotal.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {order.status === 'PENDING' && isBuyer && (
              <Card>
                <CardContent className="p-6">
                  <Button
                    onClick={handlePay}
                    className="w-full"
                    size="lg"
                    disabled={createCheckout.isPending}
                  >
                    {createCheckout.isPending
                      ? 'Creating checkout...'
                      : `Pay $${order.buyerTotal.toFixed(2)}`}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Money held in escrow until delivery confirmed.
                  </p>
                </CardContent>
              </Card>
            )}

            {order.status === 'DELIVERED' && isBuyer && (
              <Card>
                <CardContent className="p-6">
                  <Button
                    onClick={handleConfirmReceipt}
                    className="w-full"
                    disabled={confirmReceipt.isPending}
                  >
                    {confirmReceipt.isPending ? 'Confirming...' : 'Confirm Receipt'}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Auto-releases in 3 days if not confirmed.
                  </p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-3">{isBuyer ? 'Seller' : 'Buyer'}</h3>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                    {(counterparty.name ?? counterparty.username ?? '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">
                      {counterparty.username ?? counterparty.name ?? '—'}
                    </div>
                    {isBuyer && counterparty.sellerRating !== undefined && (
                      <div className="text-xs text-muted-foreground">
                        ★ {counterparty.sellerRating.toFixed(1)}
                      </div>
                    )}
                  </div>
                </div>
                {order.status !== 'CANCELLED' && order.status !== 'PENDING' && (
                  <ChatButton
                    orderId={order.id}
                    label={isBuyer ? 'Message seller' : 'Message buyer'}
                    variant="outline"
                    className="w-full"
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}

function Timeline({ order }: { order: OrderDetail }) {
  const events: Array<{ label: string; date?: string | null; done: boolean }> = [
    { label: 'Order created', date: order.createdAt, done: true },
    {
      label: 'Payment received',
      date: order.paymentCapturedAt,
      done: !!order.paymentCapturedAt,
    },
    {
      label: 'Marked as delivered',
      date: order.deliveredAt,
      done: !!order.deliveredAt,
    },
    {
      label: 'Receipt confirmed',
      date: order.confirmedAt,
      done: !!order.confirmedAt,
    },
  ];

  return (
    <div className="space-y-3">
      {events.map((event, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className={`h-3 w-3 rounded-full ${event.done ? 'bg-success' : 'bg-muted'}`} />
          <div className="flex-1">
            <div className={`text-sm ${event.done ? '' : 'text-muted-foreground'}`}>
              {event.label}
            </div>
            {event.date && (
              <div className="text-xs text-muted-foreground">
                {new Date(event.date).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
