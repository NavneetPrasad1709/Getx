import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Boosting & Raids — Pokémon GO · GETX',
  description:
    'Hire pro Pokémon GO trainers for XP grinding, stardust farming, legendary raid wins, and rank push. Post your request — sellers bid, escrow until done.',
  openGraph: {
    title: 'Pokémon GO boosting & raids · GETX',
    description:
      'XP grind, stardust, legendary raids, shiny hunts — post your request and let sellers bid.',
    url: 'https://getx.live/games/pokemon-go/boosting',
    siteName: 'GETX',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pokémon GO boosting · GETX',
    description: 'Pro boosting services — raids, XP, stardust — escrow-protected.',
  },
  alternates: {
    canonical: 'https://getx.live/games/pokemon-go/boosting',
  },
};

export default function BoostingBrowseLayout({ children }: { children: React.ReactNode }) {
  return children;
}
