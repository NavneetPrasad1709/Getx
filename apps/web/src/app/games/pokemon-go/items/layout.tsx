import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Items & Bundles — Pokémon GO · GETX',
  description:
    'Buy Pokémon GO item bundles — ultra balls, raid passes, lures, berries, and event packs. Bulk discounts, fast delivery. Verified sellers, escrow on every order.',
  openGraph: {
    title: 'Pokémon GO items & bundles · GETX',
    description:
      'Raid passes, lures, ultra balls, berries, and event bundles — bulk discounts, fast delivery.',
    url: 'https://getx.live/games/pokemon-go/items',
    siteName: 'GETX',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pokémon GO items · GETX',
    description: 'Buy raid passes, lures, and item bundles — escrow-protected.',
  },
  alternates: {
    canonical: 'https://getx.live/games/pokemon-go/items',
  },
};

export default function ItemsBrowseLayout({ children }: { children: React.ReactNode }) {
  return children;
}
