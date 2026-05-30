import type { MetadataRoute } from 'next';

/* PWA manifest.

   Brand-correct colors: noir background (#0A0A0B) and cyan-volt theme
   (#00E5FF) so the splash/title chrome on Android matches the in-app feel.
   Maskable icons let Android render a proper adaptive icon (we ship both a
   regular + maskable variant so the OS can pick).

   Shortcuts surface the three fastest-paths from the home-screen long-press:
   Browse accounts, top-ups, and wishlist. */

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'GetX — Get gaming.',
    short_name: 'GetX',
    description:
      // WEB-MED-031: removed "UPI payouts" — India-specific, contradicts global pivot
      'Escrow-protected gaming marketplace. Buy Pokémon GO accounts, top-ups, items, and boosting services. Sub-10-minute delivery.',
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0A0A0B',
    theme_color: '#00E5FF',
    categories: ['games', 'shopping', 'social'],
    icons: [
      { src: '/icon', sizes: '32x32', type: 'image/png' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
      { src: '/apple-icon', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/apple-icon', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/apple-icon', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/apple-icon', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      {
        name: 'Browse accounts',
        short_name: 'Accounts',
        description: 'Pokémon GO trainer accounts',
        url: '/games/pokemon-go/accounts?source=pwa-shortcut',
        icons: [{ src: '/icon', sizes: '32x32' }],
      },
      {
        name: 'PokéCoin top-ups',
        short_name: 'Top-ups',
        description: 'PokéCoin packs',
        url: '/games/pokemon-go/top-ups?source=pwa-shortcut',
        icons: [{ src: '/icon', sizes: '32x32' }],
      },
      {
        name: 'My wishlist',
        short_name: 'Wishlist',
        description: 'Saved drops',
        url: '/profile/wishlist?source=pwa-shortcut',
        icons: [{ src: '/icon', sizes: '32x32' }],
      },
    ],
  };
}
