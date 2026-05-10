import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'GETX',
    short_name: 'GETX',
    description:
      'Get X. Get gaming. Escrow-protected marketplace for Pokémon GO accounts, top-ups, items, and boosting services.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#2563eb',
    icons: [],
  };
}
