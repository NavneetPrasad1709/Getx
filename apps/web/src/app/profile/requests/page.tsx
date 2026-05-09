'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge, Button, Card, CardContent, Skeleton } from '@getx/ui';
import { Header } from '@/components/header';
import { LandingFooter } from '@/components/landing/landing-footer';
import { useMyRequests, type CustomRequest, type RequestStatus } from '@/hooks/use-custom-requests';
import { useAuth } from '@/hooks/use-auth';

export default function MyRequestsPage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const { data: requests, isLoading } = useMyRequests();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login?next=/profile/requests');
    }
  }, [loading, isAuthenticated, router]);

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-8">
          <Skeleton className="h-96 w-full" />
        </main>
        <LandingFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container py-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold mb-1">My Requests</h1>
            <p className="text-sm text-muted-foreground">
              Track your custom requests and offers received.
            </p>
          </div>
          <Link href="/games/pokemon-go/boosting">
            <Button>+ New Request</Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : !requests || requests.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <h2 className="font-semibold text-lg mb-1">No requests yet</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Post your first custom request and let sellers compete for your business.
              </p>
              <Link href="/games/pokemon-go/boosting">
                <Button>Browse boosting services</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <RequestRow key={req.id} request={req} />
            ))}
          </div>
        )}
      </main>

      <LandingFooter />
    </div>
  );
}

function RequestRow({ request }: { request: CustomRequest }) {
  const offerCount = request._count?.offers ?? request.offerCount ?? 0;

  return (
    <Link href={`/requests/${request.id}`} className="block group">
      <Card className="hover:border-primary/50 transition-colors">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-1">
                <span className="font-mono">{request.requestNumber}</span>
                <span aria-hidden="true">·</span>
                <StatusBadge status={request.status} />
                <span aria-hidden="true">·</span>
                <span>{request.game.name}</span>
              </div>
              <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                {request.title}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-2">{request.description}</p>
            </div>
            <div className="text-right shrink-0">
              <div className="font-display text-lg font-bold">
                ${request.budgetMin.toFixed(0)} - ${request.budgetMax.toFixed(0)}
              </div>
              <div className="text-xs text-muted-foreground">
                {offerCount} offer{offerCount === 1 ? '' : 's'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function StatusBadge({ status }: { status: RequestStatus }) {
  return <Badge variant="secondary">{status.replace('_', ' ')}</Badge>;
}
