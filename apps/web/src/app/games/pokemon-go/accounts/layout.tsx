import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Trainer Accounts — Pokémon GO · GETX',
  description:
    'Buy pre-leveled Pokémon GO trainer accounts with shinies, hundos, legendaries, and regional Pokémon. All escrow-protected. Browse 100s of verified listings.',
  openGraph: {
    title: 'Pokémon GO trainer accounts · GETX',
    description:
      'Pre-leveled accounts with shinies, hundos, legendary collections, and master-trainer medals — escrow on every order.',
    url: 'https://getx.live/games/pokemon-go/accounts',
    siteName: 'GETX',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pokémon GO accounts · GETX',
    description: 'Buy trainer accounts — shinies, hundos, legendaries — escrow-protected.',
  },
  alternates: {
    canonical: 'https://getx.live/games/pokemon-go/accounts',
  },
};

export default function AccountsBrowseLayout({ children }: { children: React.ReactNode }) {
  return children;
}
