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
import { useAdminUser, useBanUser, useUnbanUser } from '@/hooks/use-admin';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-b-0 gap-3">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="font-medium text-sm text-right break-words">{value}</span>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-2xl font-display font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

function extractMessage(err: unknown): string | null {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { message?: string } | undefined;
    return data?.message ?? null;
  }
  return null;
}

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: user, isLoading, refetch } = useAdminUser(id);
  const banMutation = useBanUser();
  const unbanMutation = useUnbanUser();
  const [banReason, setBanReason] = useState('');
  const [showBanForm, setShowBanForm] = useState(false);

  const handleBan = async () => {
    if (banReason.length < 5) {
      toast.error('Reason required (min 5 chars)');
      return;
    }
    try {
      await banMutation.mutateAsync({ userId: id, reason: banReason });
      toast.success('User banned');
      setShowBanForm(false);
      setBanReason('');
      void refetch();
    } catch (err) {
      toast.error(extractMessage(err) ?? 'Ban failed');
    }
  };

  const handleUnban = async () => {
    if (!confirm('Unban this user?')) return;
    try {
      await unbanMutation.mutateAsync(id);
      toast.success('User unbanned');
      void refetch();
    } catch (err) {
      toast.error(extractMessage(err) ?? 'Unban failed');
    }
  };

  if (isLoading) {
    return (
      <AdminShell>
        <div className="container max-w-4xl py-8">
          <Skeleton className="h-96" />
        </div>
      </AdminShell>
    );
  }
  if (!user) {
    return (
      <AdminShell>
        <div className="container max-w-4xl py-8">
          <Card>
            <CardContent className="p-12 text-center">User not found</CardContent>
          </Card>
        </div>
      </AdminShell>
    );
  }

  const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';

  return (
    <AdminShell>
      <div className="container max-w-4xl py-8">
        <h1 className="font-display text-3xl font-bold mb-1">
          {user.username ?? user.name ?? 'User'}
        </h1>
        <p className="text-muted-foreground mb-6">{user.email}</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <MetricCard label="Buyer Orders" value={user._count?.buyerOrders ?? 0} />
          <MetricCard label="Seller Orders" value={user._count?.sellerOrders ?? 0} />
          <MetricCard label="Listings" value={user._count?.productListings ?? 0} />
          <MetricCard label="Custom Requests" value={user._count?.customRequests ?? 0} />
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Account</CardTitle>
          </CardHeader>
          <CardContent>
            <Row label="Status" value={<Badge>{user.status}</Badge>} />
            <Row label="Role" value={<Badge variant="outline">{user.role}</Badge>} />
            <Row label="Country" value={user.country} />
            <Row label="KYC Level" value={user.kycLevel} />
            <Row label="Email Verified" value={user.emailVerified ? 'Yes' : 'No'} />
            <Row label="Is Seller" value={user.isSeller ? 'Yes' : 'No'} />
            <Row
              label="Seller Rating"
              value={`${user.sellerRating?.toFixed(1) ?? '0.0'} (${user.totalReviews ?? 0} reviews)`}
            />
            <Row label="Buyer Rating" value={user.buyerRating?.toFixed(1) ?? '0.0'} />
            <Row label="Wallet" value={`$${(user.sellerWallet ?? 0).toFixed(2)}`} />
            <Row label="Total Earned" value={`$${(user.totalEarned ?? 0).toFixed(2)}`} />
            <Row label="Joined" value={new Date(user.createdAt).toLocaleString()} />
            <Row
              label="Last Login"
              value={user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}
            />
            {user.banReason && (
              <Row
                label="Ban Reason"
                value={<span className="text-error">{user.banReason}</span>}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Actions</CardTitle>
          </CardHeader>
          <CardContent>
            {isAdmin ? (
              <p className="text-sm text-muted-foreground">Cannot ban another admin.</p>
            ) : user.status === 'BANNED' ? (
              <Button onClick={handleUnban} disabled={unbanMutation.isPending}>
                {unbanMutation.isPending ? 'Unbanning…' : 'Unban User'}
              </Button>
            ) : showBanForm ? (
              <div className="space-y-3">
                <Input
                  placeholder="Reason for ban (audit log, min 5 chars)"
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowBanForm(false);
                      setBanReason('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleBan} disabled={banMutation.isPending}>
                    {banMutation.isPending ? 'Banning…' : 'Confirm Ban'}
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" onClick={() => setShowBanForm(true)}>
                Ban User
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
