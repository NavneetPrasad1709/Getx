'use client';

import Link from 'next/link';
import { Badge, Button, Card, CardContent, Skeleton, toast } from '@getx/ui';
import { SellerShell } from '@/components/seller-shell';
import { useMyOffers, useWithdrawOffer, type OfferStatus } from '@/hooks/use-seller-offers';

const STATUS_VARIANT: Record<OfferStatus, 'default' | 'secondary' | 'success' | 'destructive'> = {
  PENDING: 'default',
  ACCEPTED: 'success',
  REJECTED: 'destructive',
  WITHDRAWN: 'secondary',
};

export default function MyOffersPage() {
  const { data: offers, isLoading } = useMyOffers();
  const withdraw = useWithdrawOffer();

  const handleWithdraw = async (id: string) => {
    if (!confirm('Withdraw this offer?')) return;
    try {
      await withdraw.mutateAsync(id);
      toast.success('Offer withdrawn');
    } catch {
      toast.error('Failed to withdraw');
    }
  };

  return (
    <SellerShell>
      <div className="container max-w-5xl py-8">
        <h1 className="font-display text-3xl font-bold mb-2">My Offers</h1>
        <p className="text-muted-foreground mb-6">Track your submitted offers and their status.</p>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : !offers || offers.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <h3 className="font-display text-xl font-semibold mb-2">No offers yet</h3>
              <p className="text-muted-foreground mb-6">
                Browse open requests and submit your first offer.
              </p>
              <Link href="/requests">
                <Button>Browse Requests</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {offers.map((offer) => (
              <Card key={offer.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge variant={STATUS_VARIANT[offer.status]}>{offer.status}</Badge>
                        <span className="text-xs text-muted-foreground font-mono">
                          {offer.request.requestNumber}
                        </span>
                      </div>
                      <Link
                        href={`/requests/${offer.request.id}`}
                        className="font-medium hover:underline"
                      >
                        {offer.request.title}
                      </Link>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                        {offer.message}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xl font-display font-bold text-primary">
                        ${offer.price.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {offer.deliveryHours}h delivery
                      </div>
                      {offer.status === 'PENDING' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleWithdraw(offer.id)}
                          className="mt-2"
                        >
                          Withdraw
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </SellerShell>
  );
}
