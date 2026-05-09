'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Skeleton, toast } from '@getx/ui';
import { Header } from '@/components/header';
import { LandingFooter } from '@/components/landing/landing-footer';
import { AxiosError } from 'axios';
import { useListing, useRelatedListings, type ListingDetail } from '@/hooks/use-listings';
import { useCreateOrderFromListing } from '@/hooks/use-orders';
import { useAuth } from '@/hooks/use-auth';
import { ListingCard } from '@/components/listings/listing-card';

const TIER_COLORS: Record<string, string> = {
  BASIC: 'bg-muted/30 text-muted-foreground',
  VERIFIED: 'bg-success/10 text-success',
  PREMIUM: 'bg-primary/10 text-primary',
  ELITE: 'bg-accent/10 text-accent-foreground',
};

function attrString(attrs: Record<string, unknown>, key: string): string | null {
  const v = attrs[key];
  return typeof v === 'string' ? v : null;
}

function attrNumber(attrs: Record<string, unknown>, key: string): number | null {
  const v = attrs[key];
  return typeof v === 'number' ? v : null;
}

export default function ItemDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params.slug;
  const { isAuthenticated } = useAuth();

  const { data: listing, isLoading, error } = useListing(slug);
  const { data: related } = useRelatedListings(slug);
  const createOrder = useCreateOrderFromListing();

  const [selectedImage, setSelectedImage] = useState(0);

  const handleBuy = async () => {
    if (!isAuthenticated) {
      toast.info('Please login to buy');
      const redirect = encodeURIComponent(window.location.pathname);
      router.push(`/auth/login?next=${redirect}`);
      return;
    }
    if (!listing) return;
    try {
      const order = await createOrder.mutateAsync({ listingId: listing.id });
      router.push(`/orders/${order.id}`);
    } catch (err) {
      const msg =
        err instanceof AxiosError
          ? (err.response?.data as { message?: string } | undefined)?.message
          : null;
      toast.error(msg ?? 'Failed to create order');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="aspect-video w-full" />
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-32 w-full" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          </div>
        </main>
        <LandingFooter />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-16">
          <Card>
            <CardContent className="p-12 text-center">
              <h1 className="font-display text-2xl font-bold mb-2">Item bundle not found</h1>
              <p className="text-muted-foreground mb-6">
                This listing may have been sold or removed.
              </p>
              <Link href="/games/pokemon-go/items">
                <Button>Browse all bundles</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        <LandingFooter />
      </div>
    );
  }

  const itemTypes: string[] = Array.isArray(listing.attributes.itemTypes)
    ? (listing.attributes.itemTypes.filter((t) => typeof t === 'string') as string[])
    : [];

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
          <Link href="/games/pokemon-go" className="hover:text-foreground">
            Pokemon GO
          </Link>
          <span aria-hidden="true">/</span>
          <Link href="/games/pokemon-go/items" className="hover:text-foreground">
            Items
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-foreground line-clamp-1">{listing.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <ListingMedia
              listing={listing}
              selectedImage={selectedImage}
              onSelect={setSelectedImage}
            />

            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold mb-2">{listing.title}</h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>SKU: {listing.sku}</span>
                <span aria-hidden="true">·</span>
                <span>{listing.viewCount} views</span>
                <span aria-hidden="true">·</span>
                <span>{listing.soldCount} sold</span>
              </div>
            </div>

            <ItemBundleStats attrs={listing.attributes} itemTypes={itemTypes} />

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-sm text-foreground">{listing.description}</p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <BuyBox listing={listing} onBuy={handleBuy} />
            <SellerCard listing={listing} />
          </div>
        </div>

        {related && related.length > 0 && (
          <section className="mt-16">
            <h2 className="font-display text-2xl font-bold mb-6">Similar bundles</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {related.slice(0, 3).map((item) => (
                <ListingCard
                  key={item.id}
                  listing={{
                    ...item,
                    sku: '',
                    originalPrice: null,
                    discountPercent: null,
                    deliveryType: 'INSTANT',
                    deliveryTime: null,
                    stock: 1,
                    soldCount: 0,
                    viewCount: 0,
                    favoriteCount: 0,
                    isFeatured: false,
                    createdAt: '',
                    seller: {
                      id: item.seller.id,
                      username: item.seller.username,
                      name: item.seller.name,
                      avatar: null,
                      sellerRating: item.seller.sellerRating,
                      totalSales: 0,
                      verifiedTier: item.seller.verifiedTier,
                      isVerified: false,
                      country: '',
                    },
                    game: { slug: 'pokemon-go', name: 'Pokemon GO', icon: '' },
                  }}
                />
              ))}
            </div>
          </section>
        )}
      </main>

      <LandingFooter />
    </div>
  );
}

function ListingMedia({
  listing,
  selectedImage,
  onSelect,
}: {
  listing: ListingDetail;
  selectedImage: number;
  onSelect: (idx: number) => void;
}) {
  const hasImages = listing.images && listing.images.length > 0;
  const safeIdx = Math.min(selectedImage, Math.max(0, (listing.images?.length ?? 1) - 1));
  const activeImage = hasImages ? listing.images[safeIdx] : null;

  return (
    <div className="space-y-3">
      <div className="aspect-video rounded-lg overflow-hidden bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
        {activeImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={activeImage}
            alt={listing.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <span className="font-display text-6xl font-bold text-primary/40">I</span>
        )}
      </div>

      {hasImages && listing.images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {listing.images.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSelect(idx)}
              className={`flex-shrink-0 w-20 h-20 rounded border-2 overflow-hidden ${
                idx === selectedImage ? 'border-primary' : 'border-transparent'
              }`}
              aria-label={`Image ${idx + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ItemBundleStats({
  attrs,
  itemTypes,
}: {
  attrs: Record<string, unknown>;
  itemTypes: string[];
}) {
  const totalQuantity = attrNumber(attrs, 'totalQuantity');
  const breakdown = attrString(attrs, 'breakdown');

  if (itemTypes.length === 0 && totalQuantity === null && !breakdown) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Bundle Contents</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {itemTypes.length > 0 && (
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
              Item Types
            </div>
            <div className="flex flex-wrap gap-1.5">
              {itemTypes.map((type) => (
                <Badge key={type} variant="secondary">
                  {type}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {totalQuantity !== null && (
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Total Quantity
            </div>
            <div className="font-semibold">{totalQuantity} items</div>
          </div>
        )}

        {breakdown && (
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Breakdown
            </div>
            <p className="text-sm whitespace-pre-line">{breakdown}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BuyBox({ listing, onBuy }: { listing: ListingDetail; onBuy: () => void }) {
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div>
          <span className="font-display text-3xl font-bold text-foreground">
            ${listing.price.toFixed(2)}
          </span>
          {listing.originalPrice !== null && (
            <span className="ml-2 text-sm text-muted-foreground line-through">
              ${listing.originalPrice.toFixed(2)}
            </span>
          )}
        </div>

        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <span className="text-success font-bold">✓</span>
            <span>
              {listing.deliveryType === 'INSTANT'
                ? 'Instant delivery'
                : (listing.deliveryTime ?? 'Manual delivery')}
            </span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-success font-bold">✓</span>
            <span>TradeShield protected</span>
          </li>
        </ul>

        <Button size="lg" className="w-full" onClick={onBuy}>
          Buy Now
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Money held in escrow until delivery confirmed
        </p>
      </CardContent>
    </Card>
  );
}

function SellerCard({ listing }: { listing: ListingDetail }) {
  const seller = listing.seller;
  const sellerInitial = (seller.name ?? seller.username ?? '?').charAt(0).toUpperCase();
  const tierClass = seller.verifiedTier
    ? (TIER_COLORS[seller.verifiedTier] ?? 'bg-muted/30 text-muted-foreground')
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Sold by</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-lg">
            {sellerInitial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">
              {seller.username ?? seller.name ?? 'Seller'}
            </div>
            <div className="text-xs text-muted-foreground">{seller.country}</div>
          </div>
          {seller.verifiedTier && tierClass && (
            <Badge className={tierClass}>{seller.verifiedTier}</Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-3 border-t">
          <SellerStat label="Rating" value={`★ ${seller.sellerRating.toFixed(1)}`} />
          <SellerStat label="Sales" value={seller.totalSales.toString()} />
        </div>
      </CardContent>
    </Card>
  );
}

function SellerStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="font-semibold text-sm">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
