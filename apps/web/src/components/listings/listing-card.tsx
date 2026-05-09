'use client';

import Link from 'next/link';
import { Badge, Card, CardContent } from '@getx/ui';
import type { Listing } from '@/hooks/use-listings';

const TIER_COLORS: Record<string, string> = {
  BASIC: 'bg-muted/30 text-muted-foreground',
  VERIFIED: 'bg-success/10 text-success',
  PREMIUM: 'bg-primary/10 text-primary',
  ELITE: 'bg-accent/10 text-accent-foreground',
};

function tabMonogram(tab: Listing['tabType']): string {
  if (tab === 'ACCOUNTS') return 'A';
  if (tab === 'TOP_UPS') return 'T';
  return 'I';
}

function tabSegment(tab: Listing['tabType']): string {
  if (tab === 'ACCOUNTS') return 'accounts';
  if (tab === 'TOP_UPS') return 'top-ups';
  return 'items';
}

interface Props {
  listing: Listing;
  /** Optional explicit href base. Defaults to game-slug + tab segment. */
  hrefBase?: string;
}

export function ListingCard({ listing, hrefBase }: Props) {
  const attrs = listing.attributes;
  const level = typeof attrs.level === 'number' ? attrs.level : null;
  const team = typeof attrs.team === 'string' ? attrs.team : null;
  const shinyCount = typeof attrs.shinyCount === 'number' ? attrs.shinyCount : null;

  const coinAmount = typeof attrs.coinAmount === 'string' ? attrs.coinAmount : null;
  const deliveryMethod = typeof attrs.deliveryMethod === 'string' ? attrs.deliveryMethod : null;
  const platform = typeof attrs.platform === 'string' ? attrs.platform : null;

  const totalQuantity = typeof attrs.totalQuantity === 'number' ? attrs.totalQuantity : null;
  const itemTypes = Array.isArray(attrs.itemTypes)
    ? (attrs.itemTypes.filter((t) => typeof t === 'string') as string[])
    : [];

  const sellerInitial = (listing.seller.name ?? listing.seller.username ?? '?')
    .charAt(0)
    .toUpperCase();

  const base = hrefBase ?? `/games/${listing.game.slug}/${tabSegment(listing.tabType)}`;
  const href = listing.slug ? `${base}/${listing.slug}` : '#';

  return (
    <Link href={href} className="block group">
      <Card className="overflow-hidden h-full hover:border-primary/50 transition-colors">
        <div className="relative aspect-video bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
          {listing.images && listing.images.length > 0 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={listing.images[0]}
              alt={listing.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <span className="font-display text-4xl font-bold text-primary/40">
              {tabMonogram(listing.tabType)}
            </span>
          )}

          {listing.isFeatured && (
            <Badge variant="default" className="absolute top-2 left-2">
              Featured
            </Badge>
          )}
          {listing.discountPercent ? (
            <Badge variant="destructive" className="absolute top-2 right-2">
              -{listing.discountPercent}%
            </Badge>
          ) : null}
        </div>

        <CardContent className="p-4">
          <h3 className="font-semibold line-clamp-2 mb-2 group-hover:text-primary transition-colors">
            {listing.title}
          </h3>

          {listing.tabType === 'ACCOUNTS' && (
            <div className="flex flex-wrap gap-1.5 mb-3 text-xs">
              {level !== null && (
                <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">
                  Lvl {level}
                </span>
              )}
              {team && (
                <span className="px-2 py-0.5 rounded bg-muted/30 text-muted-foreground">
                  {team}
                </span>
              )}
              {shinyCount !== null && (
                <span className="px-2 py-0.5 rounded bg-warning/10 text-warning">
                  ★ {shinyCount} shinies
                </span>
              )}
            </div>
          )}

          {listing.tabType === 'TOP_UPS' && (
            <div className="flex flex-wrap gap-1.5 mb-3 text-xs">
              {coinAmount && (
                <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">
                  {coinAmount} coins
                </span>
              )}
              {deliveryMethod && (
                <span className="px-2 py-0.5 rounded bg-muted/30 text-muted-foreground">
                  {deliveryMethod}
                </span>
              )}
              {platform && (
                <span className="px-2 py-0.5 rounded bg-accent/10 text-accent-foreground">
                  {platform}
                </span>
              )}
            </div>
          )}

          {listing.tabType === 'ITEMS' && (
            <div className="flex flex-wrap gap-1.5 mb-3 text-xs">
              {totalQuantity !== null && (
                <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">
                  {totalQuantity} items
                </span>
              )}
              {itemTypes.slice(0, 2).map((t) => (
                <span key={t} className="px-2 py-0.5 rounded bg-muted/30 text-muted-foreground">
                  {t}
                </span>
              ))}
              {itemTypes.length > 2 && (
                <span className="px-2 py-0.5 rounded bg-muted/30 text-muted-foreground">
                  +{itemTypes.length - 2}
                </span>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 mb-3 text-xs">
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
              {sellerInitial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">
                {listing.seller.username ?? listing.seller.name ?? 'Seller'}
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <span>★ {listing.seller.sellerRating.toFixed(1)}</span>
                <span aria-hidden="true">·</span>
                <span>{listing.seller.totalSales} sales</span>
              </div>
            </div>
            {listing.seller.verifiedTier && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                  TIER_COLORS[listing.seller.verifiedTier] ?? 'bg-muted/30 text-muted-foreground'
                }`}
              >
                {listing.seller.verifiedTier}
              </span>
            )}
          </div>

          <div className="flex items-end justify-between pt-3 border-t">
            <div>
              <span className="font-display text-xl font-bold text-foreground">
                ${listing.price.toFixed(2)}
              </span>
              {listing.originalPrice !== null && (
                <span className="ml-2 text-xs text-muted-foreground line-through">
                  ${listing.originalPrice.toFixed(2)}
                </span>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {listing.deliveryType === 'INSTANT' ? 'Instant' : (listing.deliveryTime ?? 'Manual')}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
