import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pokémon GO — Accounts, PokéCoins, Items, Boosting · GETX',
  description:
    'Buy Pokémon GO accounts, PokéCoin top-ups, raid items, and boosting services. Verified sellers, escrow on every order, instant delivery on top-ups.',
  keywords: [
    'pokemon go accounts',
    'pokemon go top-up',
    'pokecoins',
    'pokemon go boosting',
    'shiny pokemon',
    'legendary pokemon',
    'pokemon go marketplace',
  ],
  openGraph: {
    title: 'Pokémon GO marketplace · GETX',
    description:
      'Trainer accounts, PokéCoin packs, items, and boosting. Escrow-protected. Instant delivery on top-ups.',
    url: 'https://getx.gg/games/pokemon-go',
    siteName: 'GETX',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pokémon GO marketplace · GETX',
    description: 'Buy trainer accounts, top-ups, items, and boosting — escrow-protected.',
  },
  alternates: {
    canonical: 'https://getx.gg/games/pokemon-go',
  },
};

export default function PokemonGoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
