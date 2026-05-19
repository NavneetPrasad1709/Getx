import type { Metadata } from 'next';

/* Shared OG/metadata builder for listing PDPs (accounts / top-ups /
   items). Each PDP's layout.tsx defers to this helper so the metadata
   shape stays consistent across listing types. */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://getx.gg';

interface ListingShape {
  title: string;
  price: number;
  currency: string;
  description: string;
  tabType: string;
  seller: { username: string | null; name: string | null };
}

async function fetchListing(slug: string): Promise<ListingShape | null> {
  try {
    const res = await fetch(`${API_URL}/listings/${encodeURIComponent(slug)}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as ListingShape;
  } catch {
    return null;
  }
}

function formatPriceShort(amount: number, currency: string): string {
  const code = (currency || 'USD').toUpperCase();
  const zeroDec = ['JPY', 'KRW', 'INR'].includes(code);
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: zeroDec ? 0 : 2,
    }).format(amount);
  } catch {
    return `${code} ${amount.toFixed(zeroDec ? 0 : 2)}`;
  }
}

/* Builds Metadata for a listing PDP. categorySegment is the URL fragment
   ('accounts' | 'top-ups' | 'items') so canonical URLs stay correct. */
export async function buildListingMetadata(
  slug: string,
  categorySegment: 'accounts' | 'top-ups' | 'items',
): Promise<Metadata> {
  const listing = await fetchListing(slug);
  if (!listing) {
    return {
      title: 'Listing on GETX',
      description: 'Browse verified gaming drops on GETX.',
    };
  }
  const seller =
    listing.seller.username ?? listing.seller.name ?? 'a verified seller';
  const priceLabel = formatPriceShort(listing.price, listing.currency);
  const desc = listing.description
    ? listing.description.slice(0, 160)
    : `${priceLabel} · sold by @${seller} · escrow-protected on GETX.`;

  const ogImage = `${SITE_URL}/api/og/listing/${encodeURIComponent(slug)}`;
  const canonical = `${SITE_URL}/games/pokemon-go/${categorySegment}/${encodeURIComponent(slug)}`;
  const title = `${listing.title} · ${priceLabel} · GETX`;

  return {
    title,
    description: desc,
    alternates: { canonical },
    openGraph: {
      title,
      description: desc,
      url: canonical,
      siteName: 'GETX',
      type: 'website',
      images: [{ url: ogImage, width: 1200, height: 630, alt: listing.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
      images: [ogImage],
    },
  };
}
