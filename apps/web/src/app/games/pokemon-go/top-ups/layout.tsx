import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PokéCoin Top-ups — Pokémon GO · GETX',
  description:
    'Buy PokéCoins for Pokémon GO at bulk-discounted prices. 5,500 · 14,500 · 25,000 coin packs auto-delivered to your Trainer ID. Verified sellers, escrow-protected.',
  openGraph: {
    title: 'Pokémon GO PokéCoin top-ups · GETX',
    description:
      'Bulk-discounted PokéCoin packs — 5,500 to 25,000 coins delivered to your Trainer ID in minutes.',
    url: 'https://getx.live/games/pokemon-go/top-ups',
    siteName: 'GETX',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Buy PokéCoins · GETX',
    description: 'Bulk PokéCoin top-ups — auto-delivered, escrow-protected.',
  },
  alternates: {
    canonical: 'https://getx.live/games/pokemon-go/top-ups',
  },
};

export default function TopUpsBrowseLayout({ children }: { children: React.ReactNode }) {
  return children;
}
