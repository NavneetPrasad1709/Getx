'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
  toast,
} from '@getx/ui';
import { Share2, Copy, Check, Star } from 'lucide-react';
import { Header } from '@/components/header';
import { LandingFooter } from '@/components/landing/landing-footer';
import { ReviewCard } from '@/components/reviews/review-card';
import { useReviewsForUser } from '@/hooks/use-reviews';
import { useListings } from '@/hooks/use-listings';
import { ListingCard, ListingCardSkeleton } from '@/components/listings/listing-card';
import { TierAsRankBadge } from '@/components/badges/rank-badge';
import { api } from '@/lib/api';

interface PublicProfile {
  id: string;
  username: string | null;
  name: string | null;
  avatar: string | null;
  bio: string | null;
  country: string;
  isSeller: boolean;
  sellerRating: number;
  buyerRating: number;
  totalReviews: number;
  totalSales: number;
  verifiedTier: string | null;
  rank?:
    | 'ROOKIE'
    | 'RISING'
    | 'TRUSTED'
    | 'PRO'
    | 'ELITE'
    | 'LEGEND'
    | null;
  xp?: number;
  isVerified: boolean;
  createdAt: string;
  lastSeenAt?: string | null;
  isOnline?: boolean;
}

function joinedAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 30) return `Joined ${days}d ago`;
  if (days < 365) return `Joined ${Math.floor(days / 30)}mo ago`;
  return `Joined ${Math.floor(days / 365)}y ago`;
}

function lastSeenLabel(iso: string | null | undefined, isOnline?: boolean): string {
  if (isOnline) return 'Online now';
  if (!iso) return 'Active recently';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `Last seen ${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Last seen ${h}h ago`;
  return 'Active recently';
}

type Tab = 'listings' | 'reviews';

export default function UserProfilePage() {
  const params = useParams<{ username: string }>();
  const username = params.username;
  const [tab, setTab] = React.useState<Tab>('listings');
  const [copied, setCopied] = React.useState(false);

  const { data: user, isLoading: userLoading } = useQuery<PublicProfile>({
    queryKey: ['user-profile', username],
    queryFn: async () => {
      const { data } = await api.get<PublicProfile>(`/users/by-username/${username}`);
      return data;
    },
    enabled: !!username,
  });

  const { data: reviews, isLoading: reviewsLoading } = useReviewsForUser(
    user?.id ?? null,
    'BUYER_REVIEWS_SELLER',
  );

  const { data: listings, isLoading: listingsLoading } = useListings({
    sellerId: user?.id ?? undefined,
    limit: 24,
  });
  const hasListings = (listings?.data?.length ?? 0) > 0;

  const shareUrl = typeof window !== 'undefined' && username
    ? `${window.location.origin}/u/${username}`
    : '';

  const shareProfile = async () => {
    if (typeof navigator === 'undefined' || !username) return;
    /* Web Share API on mobile, clipboard fallback on desktop. */
    if ('share' in navigator) {
      try {
        await (
          navigator as Navigator & { share: (data: ShareData) => Promise<void> }
        ).share({
          title: `@${username} on GETX`,
          text: `Check out @${username}'s listings on GETX.`,
          url: shareUrl,
        });
        return;
      } catch {
        /* user cancelled — fall through to clipboard */
      }
    }
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      } catch {
        toast.error('Clipboard blocked — copy manually');
      }
    }
  };

  if (userLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="container py-8 flex-1 max-w-5xl">
          <Skeleton className="h-40 mb-6" />
          <Skeleton className="h-12 mb-4 w-64" />
          <Skeleton className="h-48" />
        </main>
        <LandingFooter />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="container py-12 flex-1 max-w-4xl">
          <Card>
            <CardContent className="p-12 text-center">
              <h1 className="font-display text-2xl font-bold mb-2">User not found</h1>
              <Link href="/">
                <Button>Back home</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        <LandingFooter />
      </div>
    );
  }

  const displayName = user.name ?? user.username ?? 'User';
  const totalReviews = reviews?.pagination.total ?? user.totalReviews;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="container py-8 flex-1 max-w-5xl">
        {/* Profile hero */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-4 flex-wrap">
              <div className="relative shrink-0">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                {user.isOnline ? (
                  <span
                    aria-label="Online now"
                    className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-[hsl(var(--success))] ring-2 ring-[hsl(var(--background))]"
                  />
                ) : null}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h1 className="font-display text-2xl font-bold truncate">{displayName}</h1>
                    {user.username && (
                      <p className="text-muted-foreground text-sm">@{user.username}</p>
                    )}
                  </div>
                  <Button
                    onClick={shareProfile}
                    variant="outline"
                    size="sm"
                    className="rounded-full shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Share2 className="h-3.5 w-3.5" />
                        Share profile
                      </>
                    )}
                  </Button>
                </div>
                <div className="flex items-center gap-3 mt-3 text-sm flex-wrap">
                  {user.sellerRating > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-[#FFCB05] text-[#FFCB05]" />
                      <span className="tabular-nums">{user.sellerRating.toFixed(2)}</span>
                      <span className="text-muted-foreground">
                        ({totalReviews} review{totalReviews === 1 ? '' : 's'})
                      </span>
                    </span>
                  )}
                  <span className="text-muted-foreground">·</span>
                  <span className="tabular-nums">{user.totalSales} sales</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{user.country}</span>
                  <TierAsRankBadge
                    tier={user.verifiedTier}
                    rank={user.rank ?? null}
                    size="md"
                  />
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                  <span
                    className={
                      user.isOnline
                        ? 'inline-flex items-center gap-1 text-[hsl(var(--success))] font-semibold'
                        : ''
                    }
                  >
                    {lastSeenLabel(user.lastSeenAt, user.isOnline)}
                  </span>
                  <span aria-hidden>·</span>
                  <span>{joinedAgo(user.createdAt)}</span>
                </div>
                {user.bio && (
                  <p className="text-sm mt-3 whitespace-pre-wrap">{user.bio}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tab nav */}
        <div className="flex items-center gap-1 border-b border-border/40 mb-6 overflow-x-auto">
          {(
            [
              { key: 'listings' as const, label: `Listings${hasListings ? ` (${listings?.pagination.total ?? 0})` : ''}` },
              { key: 'reviews' as const, label: `Reviews${totalReviews > 0 ? ` (${totalReviews})` : ''}` },
            ]
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`shrink-0 px-4 py-2.5 text-[13.5px] font-semibold transition-colors ${
                tab === t.key
                  ? 'text-[hsl(var(--primary))] border-b-2 border-[hsl(var(--primary))]'
                  : 'text-muted-foreground hover:text-foreground border-b-2 border-transparent'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'listings' ? (
          <section>
            {listingsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <ListingCardSkeleton key={i} />
                ))}
              </div>
            ) : !hasListings ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">
                    @{user.username ?? 'user'} has no active listings right now.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {listings!.data.map((l) => (
                  <ListingCard key={l.id} listing={l} />
                ))}
              </div>
            )}
          </section>
        ) : null}

        {tab === 'reviews' ? (
          <section>
            {/* Rating distribution */}
            {reviews && totalReviews > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg">Rating distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = reviews.distribution[star as 1 | 2 | 3 | 4 | 5] ?? 0;
                      const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                      return (
                        <div key={star} className="flex items-center gap-3 text-sm">
                          <span className="w-12 text-muted-foreground">{star} ★</span>
                          <div className="flex-1 h-2 rounded-full bg-muted/50 overflow-hidden">
                            <div
                              className="h-full bg-warning"
                              style={{ width: `${pct}%` }}
                              role="progressbar"
                              aria-valuenow={count}
                              aria-valuemin={0}
                              aria-valuemax={totalReviews}
                            />
                          </div>
                          <span className="w-12 text-right text-muted-foreground">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {reviewsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
              </div>
            ) : !reviews || reviews.data.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">No reviews yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {reviews.data.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            )}
          </section>
        ) : null}
      </main>

      <LandingFooter />
    </div>
  );
}
