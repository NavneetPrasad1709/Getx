'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
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
import { AdminShell } from '@/components/admin-shell';
import { useAdminOrder, useForceRelease, useRefundOrder } from '@/hooks/use-admin';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-b-0 gap-3">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="font-medium text-sm text-right break-words">{value}</span>
    </div>
  );
}

function extractMessage(err: unknown): string | null {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { message?: string } | undefined;
    return data?.message ?? null;
  }
  return null;
}

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: order, isLoading, refetch } = useAdminOrder(id);
  const release = useForceRelease();
  const refund = useRefundOrder();

  const [showRelease, setShowRelease] = useState(false);
  const [releaseReason, setReleaseReason] = useState('');
  const [showRefund, setShowRefund] = useState(false);
  const [refundReason, setRefundReason] = useState('');

  if (isLoading) {
    return (
      <AdminShell>
        <div className="container max-w-4xl py-8">
          <Skeleton className="h-96" />
        </div>
      </AdminShell>
    );
  }
  if (!order) {
    return (
      <AdminShell>
        <div className="container max-w-4xl py-8">
          <Card>
            <CardContent className="p-12 text-center">Order not found</CardContent>
          </Card>
        </div>
      </AdminShell>
    );
  }

  const handleRelease = async () => {
    if (releaseReason.length < 5) {
      toast.error('Reason required (min 5 chars)');
      return;
    }
    try {
      await release.mutateAsync({ orderId: id, reason: releaseReason });
      toast.success('Escrow released, seller paid');
      setShowRelease(false);
      setReleaseReason('');
      void refetch();
    } catch (err) {
      toast.error(extractMessage(err) ?? 'Release failed');
    }
  };

  const handleRefund = async () => {
    if (refundReason.length < 5) {
      toast.error('Reason required (min 5 chars)');
      return;
    }
    if (!confirm(`Refund $${order.buyerTotal.toFixed(2)} to buyer via payment provider?`)) return;
    try {
      await refund.mutateAsync({
        orderId: id,
        reason: refundReason,
        fullRefund: true,
      });
      toast.success('Refund issued');
      setShowRefund(false);
      setRefundReason('');
      void refetch();
    } catch (err) {
      toast.error(extractMessage(err) ?? 'Refund failed');
    }
  };

  const canRelease = order.escrowStatus === 'HELD';
  const canRefund =
    order.status === 'PAID' || order.status === 'IN_PROGRESS' || order.status === 'DELIVERED';

  return (
    <AdminShell>
      <div className="container max-w-4xl py-8">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="font-mono text-sm text-muted-foreground">{order.orderNumber}</span>
          <Badge variant="secondary">{order.status.replace('_', ' ')}</Badge>
          <Badge variant="outline">Escrow: {order.escrowStatus}</Badge>
        </div>
        <h1 className="font-display text-2xl font-bold mb-6">
          {order.productListing?.title ??
            order.customRequest?.title ??
            `Order ${order.orderNumber}`}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Buyer</CardTitle>
            </CardHeader>
            <CardContent>
              <Row label="Name" value={order.buyer.username ?? order.buyer.name ?? '—'} />
              <Row label="Email" value={order.buyer.email} />
              <Row label="Country" value={order.buyer.country} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Seller</CardTitle>
            </CardHeader>
            <CardContent>
              <Row label="Name" value={order.seller.username ?? order.seller.name ?? '—'} />
              <Row label="Email" value={order.seller.email} />
              <Row label="Country" value={order.seller.country} />
              <Row label="Wallet" value={`$${order.seller.sellerWallet?.toFixed(2) ?? '0.00'}`} />
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Pricing & Money Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <Row label="Item subtotal" value={`$${order.amount.toFixed(2)}`} />
            <Row label="Buyer fee (8%)" value={`$${order.buyerFee.toFixed(2)}`} />
            <Row
              label="Buyer total"
              value={<span className="font-bold">${order.buyerTotal.toFixed(2)}</span>}
            />
            <Row label="Seller commission (10%)" value={`-$${order.sellerCommission.toFixed(2)}`} />
            <Row
              label="Seller payout"
              value={
                <span className="text-primary font-bold">${order.sellerAmount.toFixed(2)}</span>
              }
            />
            <Row
              label="Payment captured"
              value={
                order.paymentCapturedAt ? new Date(order.paymentCapturedAt).toLocaleString() : '—'
              }
            />
            <Row label="Payment provider" value={order.paymentProvider ?? '—'} />
            <Row
              label="Auto-release at"
              value={order.autoReleaseAt ? new Date(order.autoReleaseAt).toLocaleString() : '—'}
            />
            {order.refundedAt && (
              <>
                <Row label="Refunded at" value={new Date(order.refundedAt).toLocaleString()} />
                <Row
                  label="Refund reason"
                  value={<span className="text-error">{order.refundReason}</span>}
                />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Admin Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {canRelease ? (
              showRelease ? (
                <div className="space-y-2">
                  <Input
                    placeholder="Reason (e.g. dispute resolved in seller's favour)"
                    value={releaseReason}
                    onChange={(e) => setReleaseReason(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowRelease(false);
                        setReleaseReason('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleRelease} disabled={release.isPending}>
                      {release.isPending
                        ? 'Releasing…'
                        : `Confirm Release ($${order.sellerAmount.toFixed(2)})`}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" onClick={() => setShowRelease(true)}>
                  Force release escrow to seller
                </Button>
              )
            ) : null}

            {canRefund ? (
              showRefund ? (
                <div className="space-y-2">
                  <Input
                    placeholder="Reason (audit + provider)"
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowRefund(false);
                        setRefundReason('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleRefund} disabled={refund.isPending}>
                      {refund.isPending
                        ? 'Refunding…'
                        : `Confirm Refund ($${order.buyerTotal.toFixed(2)})`}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="destructive" onClick={() => setShowRefund(true)}>
                  Refund order to buyer
                </Button>
              )
            ) : null}

            {!canRelease && !canRefund && (
              <p className="text-sm text-muted-foreground">
                No admin actions available for this order state.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
