'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AxiosError } from 'axios';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Skeleton, toast } from '@getx/ui';
import { Header } from '@/components/header';
import { LandingFooter } from '@/components/landing/landing-footer';
import {
  useCancelRequest,
  useRequest,
  type RequestOffer,
  type RequestStatus,
} from '@/hooks/use-custom-requests';
import { useCreateOrderFromOffer } from '@/hooks/use-orders';
import { useAuth } from '@/hooks/use-auth';
import { ChatButton } from '@/components/chat/chat-button';
import { TierAsRankBadge } from '@/components/badges/rank-badge';
import { ShareOfferButton } from '@/components/offers/share-offer-button';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://getx.live';

function humanizeKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function humanizeAttr(value: unknown): string {
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

export default function RequestDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const { user } = useAuth();

  const { data: request, isLoading } = useRequest(id);
  const cancelMutation = useCancelRequest();
  const createOrderFromOffer = useCreateOrderFromOffer();

  const isOwner = !!user && !!request && user.id === request.buyer.id;

  const handleCancel = async () => {
    if (!confirm('Cancel this request? All offers will be withdrawn.')) return;
    try {
      await cancelMutation.mutateAsync(id);
      toast.success('Request cancelled');
      router.push('/profile/requests');
    } catch (error) {
      const msg =
        error instanceof AxiosError
          ? (error.response?.data as { message?: string } | undefined)?.message
          : null;
      toast.error(msg ?? 'Failed to cancel');
    }
  };

  const handleAcceptOffer = async (offerId: string) => {
    if (!confirm('Accept this offer and proceed to checkout?')) return;
    try {
      const order = await createOrderFromOffer.mutateAsync({ offerId });
      router.push(`/orders/${order.id}`);
    } catch (error) {
      const msg =
        error instanceof AxiosError
          ? (error.response?.data as { message?: string } | undefined)?.message
          : null;
      toast.error(msg ?? 'Failed to accept offer');
    }
  };

  if (isLoading) {
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

  if (!request) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-16">
          <Card>
            <CardContent className="p-12 text-center">
              <h1 className="font-display text-2xl font-bold mb-2">Request not found</h1>
              <Link href="/games/pokemon-go/boosting">
                <Button>Browse boosting services</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        <LandingFooter />
      </div>
    );
  }

  const attrs = request.attributes;
  const expiresIn = new Date(request.expiresAt).getTime() - Date.now();
  const expiresInDays = Math.max(0, Math.floor(expiresIn / (1000 * 60 * 60 * 24)));

  const subCategoryLabel = request.subCategory
    ? request.subCategory
        .split('-')
        .map((w) => (w.length > 0 ? w[0]!.toUpperCase() + w.slice(1) : w))
        .join(' ')
    : null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container py-8">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1 text-sm text-muted-foreground mb-4"
        >
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <Link href={`/games/${request.game.slug}/boosting`} className="hover:text-foreground">
            {request.game.name} Boosting
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-foreground">{request.requestNumber}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-2">
                <span className="font-mono">{request.requestNumber}</span>
                <span aria-hidden="true">·</span>
                <StatusBadge status={request.status} />
                {subCategoryLabel && (
                  <>
                    <span aria-hidden="true">·</span>
                    <Badge variant="secondary">{subCategoryLabel}</Badge>
                  </>
                )}
              </div>
              <h1 className="font-display text-2xl md:text-3xl font-bold mb-2">{request.title}</h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>{request.viewCount} views</span>
                <span aria-hidden="true">·</span>
                <span>{request.offerCount} offers</span>
                <span aria-hidden="true">·</span>
                <span>{expiresInDays > 0 ? `Expires in ${expiresInDays}d` : 'Expired'}</span>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-sm">{request.description}</p>
              </CardContent>
            </Card>

            {Object.keys(attrs).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Specifics</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {Object.entries(attrs).map(([key, value]) => (
                      <div key={key}>
                        <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                          {humanizeKey(key)}
                        </dt>
                        <dd className="font-semibold text-sm break-words">{humanizeAttr(value)}</dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Offers ({request.offers?.length ?? 0})</CardTitle>
                {isOwner && request.offers && request.offers.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    Sorted by price (low to high)
                  </span>
                )}
              </CardHeader>
              <CardContent>
                {!request.offers || request.offers.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="font-medium mb-1">No offers yet</p>
                    <p className="text-sm text-muted-foreground">
                      {request.status === 'OPEN'
                        ? 'Sellers are reviewing your request. Offers usually arrive within minutes to hours.'
                        : 'This request is no longer accepting offers.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {request.offers.map((offer) => (
                      <OfferRow
                        key={offer.id}
                        offer={offer}
                        canAccept={isOwner && request.status === 'OPEN'}
                        canMessage={isOwner}
                        canShare={!!user && user.id === offer.seller.id}
                        onAccept={() => handleAcceptOffer(offer.id)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardContent className="p-6 space-y-2">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Budget</div>
                <div className="font-display text-2xl font-bold">
                  ${request.budgetMin.toFixed(2)} - ${request.budgetMax.toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Delivery: {request.deliveryDays} days
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Posted by</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                    {(request.buyer.name ?? request.buyer.username ?? '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">
                      {request.buyer.username ?? request.buyer.name ?? 'Buyer'}
                    </div>
                    <div className="text-xs text-muted-foreground">{request.buyer.country}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {isOwner && (request.status === 'OPEN' || request.status === 'AWAITING_CHOICE') && (
              <Card>
                <CardContent className="p-6">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleCancel}
                    disabled={cancelMutation.isPending}
                  >
                    {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Request'}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}

function OfferRow({
  offer,
  canAccept,
  canMessage,
  canShare,
  onAccept,
}: {
  offer: RequestOffer;
  canAccept: boolean;
  canMessage: boolean;
  canShare: boolean;
  onAccept: () => void;
}) {
  const initial = (offer.seller.name ?? offer.seller.username ?? '?').charAt(0).toUpperCase();

  return (
    <div className="flex items-start gap-3 p-4 border rounded-lg">
      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0">
            <div className="font-semibold truncate">
              {offer.seller.username ?? offer.seller.name ?? 'Seller'}
            </div>
            <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              <span>★ {offer.seller.sellerRating.toFixed(1)}</span>
              <span aria-hidden="true">·</span>
              <span>{offer.seller.totalSales} sales</span>
              <span aria-hidden="true">·</span>
              <span>{offer.seller.country}</span>
              <TierAsRankBadge
                tier={offer.seller.verifiedTier}
                rank={offer.seller.rank ?? null}
                size="xs"
              />
            </div>
          </div>
          <div className="flex items-start gap-2 shrink-0">
            <div className="text-right">
              <div className="font-display text-xl font-bold">${offer.price.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">Delivers in {offer.deliveryHours}h</div>
            </div>
            {canShare ? (
              <ShareOfferButton
                offerId={offer.id}
                shareUrl={`${SITE_URL}/o/${offer.id}`}
                variant="icon"
              />
            ) : null}
          </div>
        </div>
        <p className="text-sm whitespace-pre-line mb-3">{offer.message}</p>
        {(canAccept || canMessage) && (
          <div className="flex flex-wrap gap-2">
            {canAccept && (
              <Button size="sm" onClick={onAccept}>
                Accept Offer
              </Button>
            )}
            {canMessage && (
              <ChatButton offerId={offer.id} variant="outline" label="Message Seller" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: RequestStatus }) {
  const map: Record<RequestStatus, { variant: 'default' | 'secondary'; label: string }> = {
    DRAFT: { variant: 'secondary', label: 'Draft' },
    OPEN: { variant: 'default', label: 'Open for offers' },
    AWAITING_CHOICE: { variant: 'secondary', label: 'Choosing seller' },
    IN_PROGRESS: { variant: 'default', label: 'In progress' },
    DELIVERED: { variant: 'secondary', label: 'Delivered' },
    COMPLETED: { variant: 'secondary', label: 'Completed' },
    CANCELLED: { variant: 'secondary', label: 'Cancelled' },
    EXPIRED: { variant: 'secondary', label: 'Expired' },
    DISPUTED: { variant: 'secondary', label: 'Disputed' },
  };
  const { variant, label } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}
