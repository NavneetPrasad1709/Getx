'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@getx/ui';
import { Header } from '@/components/header';
import { LandingFooter } from '@/components/landing/landing-footer';
import { ReviewCard } from '@/components/reviews/review-card';
import { useReviewsForUser } from '@/hooks/use-reviews';
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
  isVerified: boolean;
  createdAt: string;
}

function joinedAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 30) return `Joined ${days}d ago`;
  if (days < 365) return `Joined ${Math.floor(days / 30)}mo ago`;
  return `Joined ${Math.floor(days / 365)}y ago`;
}

export default function UserProfilePage() {
  const params = useParams<{ username: string }>();
  const username = params.username;

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

  if (userLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="container py-8 flex-1 max-w-4xl">
          <Skeleton className="h-32 mb-6" />
          <Skeleton className="h-48 mb-6" />
          <Skeleton className="h-32" />
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

      <main className="container py-8 flex-1 max-w-4xl">
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-4 flex-wrap">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="font-display text-2xl font-bold truncate">{displayName}</h1>
                {user.username && <p className="text-muted-foreground text-sm">@{user.username}</p>}
                <div className="flex items-center gap-3 mt-3 text-sm flex-wrap">
                  {user.sellerRating > 0 && (
                    <span>
                      <span className="text-warning" aria-hidden="true">
                        ★
                      </span>{' '}
                      {user.sellerRating.toFixed(1)} ({totalReviews} review
                      {totalReviews === 1 ? '' : 's'})
                    </span>
                  )}
                  <span>{user.totalSales} sales</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{user.country}</span>
                  {user.verifiedTier && <Badge>{user.verifiedTier}</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-2">{joinedAgo(user.createdAt)}</p>
                {user.bio && <p className="text-sm mt-3 whitespace-pre-wrap">{user.bio}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

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

        <h2 className="font-display text-2xl font-bold mb-4">Reviews</h2>
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
      </main>

      <LandingFooter />
    </div>
  );
}
