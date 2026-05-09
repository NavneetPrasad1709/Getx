'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AxiosError } from 'axios';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Skeleton,
  toast,
} from '@getx/ui';
import { SellerShell } from '@/components/seller-shell';
import {
  useMarkDelivered,
  useSellerOrder,
  type SellerOrderDetail,
} from '@/hooks/use-seller-orders';
import { ChatButton } from '@/components/chat/chat-button';

function snapshotTitle(order: SellerOrderDetail): string {
  return (
    order.productListing?.title ??
    order.customRequest?.title ??
    order.paymentMetadata?.snapshotTitle ??
    `Order ${order.orderNumber}`
  );
}

function extractMessage(err: unknown): string | null {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { message?: string } | undefined;
    return data?.message ?? null;
  }
  return null;
}

export default function SellerOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { data: order, isLoading } = useSellerOrder(id);
  const markDelivered = useMarkDelivered();

  const [proofImagesText, setProofImagesText] = useState('');
  const [notes, setNotes] = useState('');
  const [credUsername, setCredUsername] = useState('');
  const [credPassword, setCredPassword] = useState('');
  const [credExtra, setCredExtra] = useState('');

  if (isLoading) {
    return (
      <SellerShell>
        <div className="container max-w-4xl py-8">
          <Skeleton className="h-96" />
        </div>
      </SellerShell>
    );
  }

  if (!order) {
    return (
      <SellerShell>
        <div className="container max-w-3xl py-8">
          <Card>
            <CardContent className="p-12 text-center">
              <h2 className="font-display text-2xl font-bold mb-2">Order not found</h2>
              <Link href="/orders">
                <Button>Back to orders</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </SellerShell>
    );
  }

  const canMarkDelivered = order.status === 'PAID' || order.status === 'IN_PROGRESS';
  const isAccountOrder = order.productListing?.title || order.productListing?.sku;

  const handleMarkDelivered = async (e: React.FormEvent) => {
    e.preventDefault();

    const proofImages = proofImagesText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 5);

    const credentials =
      credUsername && credPassword
        ? {
            username: credUsername,
            password: credPassword,
            extra: credExtra || undefined,
          }
        : undefined;

    try {
      await markDelivered.mutateAsync({
        id: order.id,
        payload: {
          proofImages,
          notes: notes || undefined,
          credentials,
        },
      });
      toast.success('Order marked as delivered. Buyer will be notified.');
    } catch (err) {
      toast.error(extractMessage(err) ?? 'Failed to mark delivered');
    }
  };

  const title = snapshotTitle(order);

  return (
    <SellerShell>
      <div className="container max-w-4xl py-8">
        <Link href="/orders" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to orders
        </Link>

        <div className="mt-4 mb-6">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-sm text-muted-foreground font-mono">{order.orderNumber}</span>
            <Badge variant="secondary">{order.status.replace('_', ' ')}</Badge>
            <Badge variant="default">Escrow: {order.escrowStatus}</Badge>
          </div>
          <h1 className="font-display text-2xl font-bold">{title}</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Buyer</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                    {(order.buyer.name ?? order.buyer.username ?? '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">
                      {order.buyer.username ?? order.buyer.name ?? '—'}
                    </div>
                    {order.buyer.email && (
                      <div className="text-xs text-muted-foreground truncate">
                        {order.buyer.email}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {canMarkDelivered && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Mark as Delivered</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleMarkDelivered} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium block mb-1.5">
                        Proof image URLs (max 5, one per line)
                      </label>
                      <textarea
                        value={proofImagesText}
                        onChange={(e) => setProofImagesText(e.target.value)}
                        placeholder="https://example.com/proof1.jpg"
                        rows={3}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium block mb-1.5">Delivery notes</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Anything the buyer needs to know..."
                        rows={3}
                        maxLength={2000}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>

                    {isAccountOrder && (
                      <div className="space-y-3 p-4 bg-muted/30 rounded-md">
                        <div className="text-sm font-medium">
                          Account Credentials (optional, only buyer sees)
                        </div>
                        <Input
                          placeholder="Username / email"
                          value={credUsername}
                          onChange={(e) => setCredUsername(e.target.value)}
                        />
                        <Input
                          type="password"
                          placeholder="Password"
                          value={credPassword}
                          onChange={(e) => setCredPassword(e.target.value)}
                        />
                        <Input
                          placeholder="Extra info (recovery email, 2FA codes…)"
                          value={credExtra}
                          onChange={(e) => setCredExtra(e.target.value)}
                        />
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={markDelivered.isPending}
                      className="w-full"
                      size="lg"
                    >
                      {markDelivered.isPending ? 'Marking delivered...' : 'Mark as Delivered'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {order.status === 'DELIVERED' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Awaiting Confirmation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Order delivered on{' '}
                    {order.deliveredAt ? new Date(order.deliveredAt).toLocaleString() : '—'}. Funds
                    will auto-release{' '}
                    {order.autoReleaseAt
                      ? new Date(order.autoReleaseAt).toLocaleString()
                      : 'in 3 days'}{' '}
                    if the buyer doesn&apos;t confirm.
                  </p>
                </CardContent>
              </Card>
            )}

            {order.status === 'COMPLETED' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Completed</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Confirmed on{' '}
                    {order.confirmedAt ? new Date(order.confirmedAt).toLocaleString() : '—'}. $
                    {order.sellerAmount.toFixed(2)} added to your wallet.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            {order.status !== 'CANCELLED' && order.status !== 'PENDING' && (
              <Card>
                <CardContent className="p-4">
                  <ChatButton
                    orderId={order.id}
                    label="Message buyer"
                    variant="outline"
                    className="w-full"
                  />
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-3">Earnings</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Order total</span>
                    <span>${order.amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Commission (10%)</span>
                    <span>−${order.sellerCommission.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold pt-2 border-t">
                    <span>Your payout</span>
                    <span className="text-primary">${order.sellerAmount.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </SellerShell>
  );
}
