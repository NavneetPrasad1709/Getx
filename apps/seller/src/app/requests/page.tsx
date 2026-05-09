'use client';

import Link from 'next/link';
import { Badge, Button, Card, CardContent, Skeleton } from '@getx/ui';
import { SellerShell } from '@/components/seller-shell';
import { useOpenRequests } from '@/hooks/use-seller-requests';
import { useAuth } from '@/hooks/use-auth';

export default function OpenRequestsPage() {
  const { user } = useAuth();
  const isSeller = !!user?.isSeller;
  const { data, isLoading } = useOpenRequests({ gameSlug: 'pokemon-go' });

  if (!isSeller) {
    return (
      <SellerShell>
        <div className="container max-w-3xl py-8">
          <Card>
            <CardContent className="p-12 text-center">
              <h2 className="font-display text-2xl font-bold mb-2">Activate seller mode first</h2>
              <Link href="/">
                <Button>Go to Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </SellerShell>
    );
  }

  return (
    <SellerShell>
      <div className="container max-w-6xl py-8">
        <h1 className="font-display text-3xl font-bold mb-2">Open Requests</h1>
        <p className="text-muted-foreground mb-6">
          Buyers looking for services. Submit competitive offers to win the job.
        </p>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : !data || data.data.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <h3 className="font-display text-xl font-semibold mb-2">No open requests</h3>
              <p className="text-muted-foreground">Check back later for new requests.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {data.data.map((req) => (
              <Link key={req.id} href={`/requests/${req.id}`} className="block">
                <Card className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="text-xs text-muted-foreground font-mono">
                            {req.requestNumber}
                          </span>
                          <Badge variant="secondary">{req.tabType}</Badge>
                          {req.subCategory && (
                            <Badge variant="default">
                              {req.subCategory
                                .split('-')
                                .map((w) => (w.length > 0 ? w[0]!.toUpperCase() + w.slice(1) : w))
                                .join(' ')}
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-semibold mb-1">{req.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {req.description}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                          <span>{req.offerCount} offers</span>
                          <span aria-hidden="true">·</span>
                          <span>{req.deliveryDays} day delivery</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-lg font-display font-bold text-primary">
                          ${req.budgetMin}-${req.budgetMax}
                        </div>
                        <div className="text-xs text-muted-foreground">{req.buyer.country}</div>
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
