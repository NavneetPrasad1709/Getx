'use client';

import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { Badge, Button, Card, CardContent, toast } from '@getx/ui';
import { SellerShell } from '@/components/seller-shell';
import { useAuth, type AuthUser } from '@/hooks/use-auth';
import { useMyListings, type SellerListing } from '@/hooks/use-seller-listings';
import { useMyOffers } from '@/hooks/use-seller-offers';
import { api } from '@/lib/api';

interface ActivateResponse {
  message: string;
  user: AuthUser;
}

export default function DashboardPage() {
  const { user, refetch } = useAuth();
  const qc = useQueryClient();
  const { data: listings } = useMyListings();
  const { data: offers } = useMyOffers();

  const activate = useMutation<ActivateResponse, Error, void>({
    mutationFn: async () => {
      const { data } = await api.patch<ActivateResponse>('/auth/me/activate-seller');
      return data;
    },
    onSuccess: async () => {
      toast.success('Seller mode activated!');
      await refetch();
      await qc.invalidateQueries();
    },
    onError: (err) => {
      const msg =
        err instanceof AxiosError
          ? (err.response?.data as { message?: string } | undefined)?.message
          : null;
      toast.error(msg ?? 'Failed to activate. Try again.');
    },
  });

  const isSeller = !!user?.isSeller;
  const sellerWallet = user?.sellerWallet ?? 0;
  const totalSales = user?.totalSales ?? 0;

  const activeListings = listings?.filter((l) => l.status === 'ACTIVE').length ?? 0;
  const pendingOffers = offers?.filter((o) => o.status === 'PENDING').length ?? 0;

  return (
    <SellerShell>
      <div className="container max-w-6xl py-8">
        {!isSeller && (
          <Card className="mb-8 border-accent/50 bg-accent/5">
            <CardContent className="p-6">
              <h2 className="font-display text-xl font-bold mb-2">Activate Seller Mode</h2>
              <p className="text-muted-foreground mb-4">
                Start selling game accounts, top-ups, items, or boosting services. No KYC required
                to begin. Verify identity later when you withdraw earnings.
              </p>
              <Button onClick={() => activate.mutate()} disabled={activate.isPending} size="lg">
                {activate.isPending ? 'Activating...' : 'Activate Seller Mode →'}
              </Button>
            </CardContent>
          </Card>
        )}

        <h1 className="font-display text-3xl font-bold mb-2">
          Welcome back, {user?.name ?? 'Seller'}
        </h1>
        <p className="text-muted-foreground mb-8">
          Manage your listings, offers, and earnings from one place.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Active Listings" value={activeListings} />
          <StatCard label="Pending Offers" value={pendingOffers} />
          <StatCard label="Wallet Balance" value={`$${sellerWallet.toFixed(2)}`} />
          <StatCard label="Total Sales" value={totalSales} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-2">Sell items directly</h3>
              <p className="text-sm text-muted-foreground mb-4">
                List accounts, top-ups, or items in the browse marketplace.
              </p>
              <Link href="/listings/new">
                <Button disabled={!isSeller}>+ Create Listing</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-2">Bid on requests</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Browse open requests and submit competitive offers.
              </p>
              <Link href="/requests">
                <Button variant="outline" disabled={!isSeller}>
                  Browse Requests
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <h2 className="font-display text-xl font-bold mb-4">Recent Activity</h2>
        <Card>
          <CardContent className="p-6">
            {(!listings || listings.length === 0) && (!offers || offers.length === 0) ? (
              <p className="text-muted-foreground text-center py-6">
                No activity yet. Create your first listing or submit an offer to get started.
              </p>
            ) : (
              <div className="space-y-3 text-sm">
                {listings?.slice(0, 3).map((l: SellerListing) => (
                  <div
                    key={l.id}
                    className="flex items-center justify-between p-3 rounded-md hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-medium truncate">{l.title}</span>
                      <span className="text-muted-foreground ml-2">· ${l.price.toFixed(2)}</span>
                    </div>
                    <Badge variant={l.status === 'ACTIVE' ? 'default' : 'secondary'}>
                      {l.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SellerShell>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-2xl font-display font-bold mb-1">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}
