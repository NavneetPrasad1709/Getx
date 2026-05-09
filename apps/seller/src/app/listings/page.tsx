'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Badge, Button, Card, CardContent, Skeleton, toast } from '@getx/ui';
import { SellerShell } from '@/components/seller-shell';
import {
  useDeleteListing,
  useMyListings,
  type ListingStatus,
  type SellerListing,
} from '@/hooks/use-seller-listings';
import { useAuth } from '@/hooks/use-auth';

type Filter = 'all' | ListingStatus;

const FILTER_TABS: Filter[] = ['all', 'ACTIVE', 'DRAFT', 'PAUSED'];

export default function ListingsPage() {
  const { user } = useAuth();
  const isSeller = !!user?.isSeller;
  const { data: listings, isLoading } = useMyListings();
  const deleteListing = useDeleteListing();
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = listings?.filter((l) => filter === 'all' || l.status === filter) ?? [];

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This can't be undone.`)) return;
    try {
      await deleteListing.mutateAsync(id);
      toast.success('Listing deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <SellerShell>
      <div className="container max-w-6xl py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold">My Listings</h1>
            <p className="text-muted-foreground">Manage your marketplace listings</p>
          </div>
          <Link href="/listings/new">
            <Button disabled={!isSeller}>+ Create Listing</Button>
          </Link>
        </div>

        <div className="flex gap-2 mb-6 border-b overflow-x-auto">
          {FILTER_TABS.map((f) => {
            const count = listings?.filter((l) => f === 'all' || l.status === f).length ?? 0;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-4 py-2 text-sm border-b-2 -mb-px transition-colors whitespace-nowrap ${
                  filter === f
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground'
                }`}
              >
                {f === 'all' ? 'All' : f} ({count})
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <h3 className="font-display text-xl font-semibold mb-2">
                {filter === 'all' ? 'No listings yet' : `No ${filter.toLowerCase()} listings`}
              </h3>
              <p className="text-muted-foreground mb-6">
                Create your first listing to start selling.
              </p>
              <Link href="/listings/new">
                <Button disabled={!isSeller}>Create Listing</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((listing) => (
              <ListingRow
                key={listing.id}
                listing={listing}
                onDelete={() => handleDelete(listing.id, listing.title)}
              />
            ))}
          </div>
        )}
      </div>
    </SellerShell>
  );
}

function ListingRow({ listing, onDelete }: { listing: SellerListing; onDelete: () => void }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-16 h-16 rounded-md bg-muted flex-shrink-0 overflow-hidden">
            {listing.images?.[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={listing.images[0]} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-2xl font-bold">
                {listing.tabType.charAt(0)}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs text-muted-foreground font-mono">{listing.sku}</span>
              <Badge variant={listing.status === 'ACTIVE' ? 'default' : 'secondary'}>
                {listing.status}
              </Badge>
              <Badge variant="secondary">{listing.tabType}</Badge>
            </div>
            <h3 className="font-medium truncate">{listing.title}</h3>
            <div className="text-sm text-muted-foreground mt-1">
              ${listing.price.toFixed(2)} · {listing.viewCount} views · {listing.soldCount} sold
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled>
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={onDelete}>
              Delete
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
