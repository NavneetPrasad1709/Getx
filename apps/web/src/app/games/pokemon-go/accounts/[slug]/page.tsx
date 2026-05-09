'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Skeleton, toast } from '@getx/ui';
import { Header } from '@/components/header';
import { LandingFooter } from '@/components/landing/landing-footer';
import { useListing, useRelatedListings, type ListingDetail } from '@/hooks/use-listings';
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

export default function AccountDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params.slug;
  const { isAuthenticated } = useAuth();

  const { data: listing, isLoading, error } = useListing(slug);
  const { data: related } = useRelatedListings(slug);

  const [selectedImage, setSelectedImage] = useState(0);

  const handleBuy = () => {
    if (!isAuthenticated) {
      toast.info('Please login to buy');
      const redirect = encodeURIComponent(window.location.pathname);
      router.push(`/auth/login?next=${redirect}`);
      return;
    }
    // TODO: cart + checkout flow ships in Prompt 12.
    toast.info('Cart & checkout coming in Prompt 12');
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
              <h1 className="font-display text-2xl font-bold mb-2">Listing not found</h1>
              <p className="text-muted-foreground mb-6">
                This listing may have been sold or removed.
              </p>
              <Link href="/games/pokemon-go/accounts">
                <Button>Browse all accounts</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        <LandingFooter />
      </div>
    );
  }

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
          <Link href="/games/pokemon-go/accounts" className="hover:text-foreground">
            Accounts
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

            {listing.tabType === 'ACCOUNTS' && <AccountStats attrs={listing.attributes} />}

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
            <h2 className="font-display text-2xl font-bold mb-6">Similar accounts</h2>
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
          <span className="font-display text-6xl font-bold text-primary/40">A</span>
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

function AccountStats({ attrs }: { attrs: Record<string, unknown> }) {
  const rows: Array<[string, string | number]> = [];
  const level = attrNumber(attrs, 'level');
  if (level !== null) rows.push(['Level', level]);
  const team = attrString(attrs, 'team');
  if (team) rows.push(['Team', team]);
  const shiny = attrNumber(attrs, 'shinyCount');
  if (shiny !== null) rows.push(['Shinies', shiny]);
  const legendary = attrNumber(attrs, 'legendaryCount');
  if (legendary !== null) rows.push(['Legendaries', legendary]);
  const mythical = attrNumber(attrs, 'mythicalCount');
  if (mythical !== null) rows.push(['Mythicals', mythical]);
  const hundo = attrNumber(attrs, 'hundoCount');
  if (hundo !== null) rows.push(['100% IV Pokemon', hundo]);
  const masterTrainer = attrNumber(attrs, 'masterTrainerCount');
  if (masterTrainer !== null) rows.push(['Master Trainer Medals', masterTrainer]);
  const region = attrString(attrs, 'region');
  if (region) rows.push(['Region', region]);
  const platform = attrString(attrs, 'platform');
  if (platform) rows.push(['Platform', platform]);

  if (rows.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Account Details</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                {label}
              </dt>
              <dd className="font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
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
          <li className="flex items-center gap-2">
            <span className="text-success font-bold">✓</span>
            <span>3-day money-back guarantee</span>
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

        <div className="grid grid-cols-3 gap-3 pt-3 border-t">
          <SellerStat label="Rating" value={`★ ${seller.sellerRating.toFixed(1)}`} />
          <SellerStat label="Sales" value={seller.totalSales.toString()} />
          {seller.completionRate !== null ? (
            <SellerStat label="Completion" value={`${seller.completionRate.toFixed(0)}%`} />
          ) : (
            <SellerStat label="Member since" value={formatYear(seller.createdAt)} />
          )}
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

function formatYear(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? String(d.getFullYear()) : '—';
}
