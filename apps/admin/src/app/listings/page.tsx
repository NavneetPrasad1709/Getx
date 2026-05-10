'use client';

import { useState } from 'react';
import { AxiosError } from 'axios';
import { Badge, Button, Card, CardContent, Input, Skeleton, toast } from '@getx/ui';
import { AdminShell } from '@/components/admin-shell';
import { useAdminListings, useHideListing, useUnhideListing } from '@/hooks/use-admin';

interface ListingRow {
  id: string;
  title: string;
  sku: string;
  status: string;
  price: number;
  game: { name: string; slug: string };
  seller: { id: string; username: string | null; name: string | null };
}

function extractMessage(err: unknown): string | null {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { message?: string } | undefined;
    return data?.message ?? null;
  }
  return null;
}

const STATUSES = [
  'DRAFT',
  'PENDING_REVIEW',
  'ACTIVE',
  'PAUSED',
  'SOLD_OUT',
  'REMOVED',
  'REJECTED',
] as const;

export default function AdminListingsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [hideTarget, setHideTarget] = useState<string | null>(null);
  const [hideReason, setHideReason] = useState('');

  const { data, isLoading, refetch } = useAdminListings({
    page,
    status: statusFilter,
  });
  const hide = useHideListing();
  const unhide = useUnhideListing();

  const handleHide = async (listingId: string) => {
    if (hideReason.length < 5) {
      toast.error('Reason required (min 5 chars)');
      return;
    }
    try {
      await hide.mutateAsync({ listingId, reason: hideReason });
      toast.success('Listing hidden');
      setHideTarget(null);
      setHideReason('');
      void refetch();
    } catch (err) {
      toast.error(extractMessage(err) ?? 'Hide failed');
    }
  };

  const handleUnhide = async (listingId: string) => {
    if (!confirm('Restore this listing to ACTIVE?')) return;
    try {
      await unhide.mutateAsync(listingId);
      toast.success('Listing restored');
      void refetch();
    } catch (err) {
      toast.error(extractMessage(err) ?? 'Unhide failed');
    }
  };

  return (
    <AdminShell>
      <div className="container max-w-7xl py-8">
        <h1 className="font-display text-3xl font-bold mb-6">Listings</h1>

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
              {STATUSES.map((s) => (
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
              No listings found
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30">
                  <tr>
                    <th className="text-left p-3">Listing</th>
                    <th className="text-left p-3">Game</th>
                    <th className="text-left p-3">Seller</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-right p-3">Price</th>
                    <th className="text-left p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.data as ListingRow[]).map((listing) => (
                    <tr
                      key={listing.id}
                      className="border-b hover:bg-muted/20 last:border-b-0 align-top"
                    >
                      <td className="p-3">
                        <div className="font-medium truncate max-w-xs">{listing.title}</div>
                        <div className="text-xs text-muted-foreground font-mono">{listing.sku}</div>
                      </td>
                      <td className="p-3 text-xs">{listing.game.name}</td>
                      <td className="p-3 text-xs">
                        {listing.seller.username ?? listing.seller.name}
                      </td>
                      <td className="p-3">
                        <Badge variant="secondary">{listing.status}</Badge>
                      </td>
                      <td className="p-3 text-right font-mono">${listing.price.toFixed(2)}</td>
                      <td className="p-3">
                        {hideTarget === listing.id ? (
                          <div className="space-y-2 max-w-xs">
                            <Input
                              value={hideReason}
                              onChange={(e) => setHideReason(e.target.value)}
                              placeholder="Reason"
                            />
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setHideTarget(null);
                                  setHideReason('');
                                }}
                              >
                                ×
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleHide(listing.id)}
                                disabled={hide.isPending}
                              >
                                {hide.isPending ? '…' : 'Hide'}
                              </Button>
                            </div>
                          </div>
                        ) : listing.status === 'REMOVED' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUnhide(listing.id)}
                            disabled={unhide.isPending}
                          >
                            Unhide
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setHideTarget(listing.id);
                              setHideReason('');
                            }}
                          >
                            Hide
                          </Button>
                        )}
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
              Page {page} of {data.pagination.totalPages}
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
