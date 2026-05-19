'use client';

import { ProductRail, type RailProduct } from './product-rail';

/* Popular product rails — one component per category.
   Every product carries seller info + at least one urgency signal.
   The image field intentionally points at the generic SVG so the rail
   falls back to a per-listing themed gradient placeholder until real
   CDN images land. */

const POGO_ACCENT = 'hsl(var(--primary))';

const SELLER = {
  rohan: { handle: '@rohan_t', rating: 4.98, orders: 412, verified: true },
  priya: { handle: '@MysticPriya', rating: 4.97, orders: 240, verified: true },
  karan: { handle: '@InstinctKaran', rating: 4.95, orders: 186, verified: true },
  arjun: { handle: '@RaidLeader_M', rating: 4.96, orders: 158, verified: true },
  neha: { handle: '@NehaPokes', rating: 4.92, orders: 92, verified: false },
  vikram: { handle: '@vikram.j', rating: 4.94, orders: 134, verified: true },
};

/* --- Popular accounts --- */
const ACCOUNTS: RailProduct[] = [
  {
    href: '/games/pokemon-go/accounts/v50-hundo-mewtwo',
    title: 'Lv 50 Valor · Hundo ×6 · 18 Legendaries',
    image: '/games/pokemon-go/hero.svg',
    category: 'Accounts',
    gameTag: 'Pokémon GO',
    gameAccent: POGO_ACCENT,
    price: 42500,
    was: 54500,
    rating: 4.98,
    badge: 'Top pick',
    seller: SELLER.rohan,
    endsIn: '4h 22m',
  },
  {
    href: '/games/pokemon-go/accounts/m47-shiny-collection',
    title: 'Lv 47 Mystic · Shiny haul · 124 shinies',
    image: '/games/pokemon-go/hero.svg',
    category: 'Accounts',
    gameTag: 'Pokémon GO',
    gameAccent: POGO_ACCENT,
    price: 18900,
    was: 24500,
    rating: 4.95,
    seller: SELLER.priya,
    stockLeft: 2,
  },
  {
    href: '/games/pokemon-go/accounts/i45-tournament-ready',
    title: 'Lv 45 Instinct · Tournament ready · GoBattle 2800+',
    image: '/games/pokemon-go/hero.svg',
    category: 'Accounts',
    gameTag: 'Pokémon GO',
    gameAccent: POGO_ACCENT,
    price: 12500,
    rating: 4.92,
    seller: SELLER.karan,
    soldRecent: 4,
  },
  {
    href: '/games/pokemon-go/accounts/v42-starter',
    title: 'Lv 42 Valor · Beginner-friendly · 4 Legendaries',
    image: '/games/pokemon-go/hero.svg',
    category: 'Accounts',
    gameTag: 'Pokémon GO',
    gameAccent: POGO_ACCENT,
    price: 4999,
    was: 6500,
    rating: 4.9,
    seller: SELLER.neha,
    soldRecent: 7,
  },
  {
    href: '/games/pokemon-go/accounts/m48-raid-king',
    title: 'Lv 48 Mystic · Raid king · 60+ raid passes',
    image: '/games/pokemon-go/hero.svg',
    category: 'Accounts',
    gameTag: 'Pokémon GO',
    gameAccent: POGO_ACCENT,
    price: 24500,
    rating: 4.97,
    badge: 'Hot drop',
    seller: SELLER.priya,
    endsIn: '11h 08m',
  },
  {
    href: '/games/pokemon-go/accounts/i46-shiny-pikachu',
    title: 'Lv 46 Instinct · 42 event Shiny Pikachu',
    image: '/games/pokemon-go/hero.svg',
    category: 'Accounts',
    gameTag: 'Pokémon GO',
    gameAccent: POGO_ACCENT,
    price: 14500,
    was: 17000,
    rating: 4.96,
    seller: SELLER.karan,
    stockLeft: 1,
  },
];

export function PopularAccounts() {
  return (
    <ProductRail
      title="Popular Accounts"
      subtitle="Hand-picked trainer accounts trading right now"
      viewAllHref="/games/pokemon-go/accounts"
      products={ACCOUNTS}
    />
  );
}

/* --- Popular top-ups --- */
const TOPUPS: RailProduct[] = [
  {
    href: '/games/pokemon-go/top-ups/pokecoins-14500',
    title: '14,500 PokéCoins · Auto delivery',
    image: '/categories/top-ups.svg',
    category: 'Top-ups',
    gameTag: 'Pokémon GO',
    gameAccent: POGO_ACCENT,
    price: 4999,
    was: 5999,
    rating: 4.98,
    badge: 'Best value',
    seller: SELLER.vikram,
    soldRecent: 12,
  },
  {
    href: '/games/pokemon-go/top-ups/pokecoins-5200',
    title: '5,200 PokéCoins · 5-min delivery',
    image: '/categories/top-ups.svg',
    category: 'Top-ups',
    gameTag: 'Pokémon GO',
    gameAccent: POGO_ACCENT,
    price: 1899,
    was: 2299,
    rating: 4.97,
    seller: SELLER.vikram,
    soldRecent: 8,
  },
  {
    href: '/games/pokemon-go/top-ups/pokecoins-2500',
    title: '2,500 PokéCoins · Direct credit',
    image: '/categories/top-ups.svg',
    category: 'Top-ups',
    gameTag: 'Pokémon GO',
    gameAccent: POGO_ACCENT,
    price: 899,
    was: 1099,
    rating: 4.96,
    seller: SELLER.priya,
    soldRecent: 14,
  },
  {
    href: '/games/pokemon-go/top-ups/pokecoins-1200',
    title: '1,200 PokéCoins · Quick top-up',
    image: '/categories/top-ups.svg',
    category: 'Top-ups',
    gameTag: 'Pokémon GO',
    gameAccent: POGO_ACCENT,
    price: 449,
    was: 549,
    rating: 4.95,
    seller: SELLER.rohan,
    soldRecent: 9,
  },
  {
    href: '/games/pokemon-go/top-ups/pokecoins-550',
    title: '550 PokéCoins · Starter pack',
    image: '/categories/top-ups.svg',
    category: 'Top-ups',
    gameTag: 'Pokémon GO',
    gameAccent: POGO_ACCENT,
    price: 199,
    was: 249,
    rating: 4.94,
    seller: SELLER.neha,
  },
  {
    href: '/games/pokemon-go/top-ups/pokecoins-100',
    title: '100 PokéCoins · Test it',
    image: '/categories/top-ups.svg',
    category: 'Top-ups',
    gameTag: 'Pokémon GO',
    gameAccent: POGO_ACCENT,
    price: 49,
    rating: 4.9,
    seller: SELLER.neha,
    badge: 'First-time pick',
  },
];

export function PopularTopUps() {
  return (
    <ProductRail
      title="Popular Top-ups"
      subtitle="Discounted PokéCoin packs — credited to your trainer in 5 minutes"
      viewAllHref="/games/pokemon-go/top-ups"
      products={TOPUPS}
    />
  );
}

/* --- Popular items --- */
const ITEMS: RailProduct[] = [
  {
    href: '/games/pokemon-go/items/raid-passes-30',
    title: '30× Remote Raid Passes · Bundle',
    image: '/categories/items.svg',
    category: 'Items',
    gameTag: 'Pokémon GO',
    gameAccent: POGO_ACCENT,
    price: 1599,
    was: 1999,
    rating: 4.96,
    badge: 'Bundle',
    seller: SELLER.arjun,
    soldRecent: 6,
  },
  {
    href: '/games/pokemon-go/items/ultra-balls-200',
    title: '200× Ultra Balls · Catch kit',
    image: '/categories/items.svg',
    category: 'Items',
    gameTag: 'Pokémon GO',
    gameAccent: POGO_ACCENT,
    price: 499,
    was: 699,
    rating: 4.92,
    seller: SELLER.neha,
    stockLeft: 3,
  },
  {
    href: '/games/pokemon-go/items/golden-razz-50',
    title: '50× Golden Razz Berries · Raid pack',
    image: '/categories/items.svg',
    category: 'Items',
    gameTag: 'Pokémon GO',
    gameAccent: POGO_ACCENT,
    price: 799,
    rating: 4.93,
    seller: SELLER.priya,
    endsIn: '6h 50m',
  },
  {
    href: '/games/pokemon-go/items/incense-30',
    title: '30× Incense · Hour-long spawn',
    image: '/categories/items.svg',
    category: 'Items',
    gameTag: 'Pokémon GO',
    gameAccent: POGO_ACCENT,
    price: 599,
    was: 849,
    rating: 4.91,
    seller: SELLER.vikram,
    soldRecent: 5,
  },
  {
    href: '/games/pokemon-go/items/lucky-egg-25',
    title: '25× Lucky Eggs · Double XP',
    image: '/categories/items.svg',
    category: 'Items',
    gameTag: 'Pokémon GO',
    gameAccent: POGO_ACCENT,
    price: 1199,
    rating: 4.95,
    badge: 'Top pick',
    seller: SELLER.karan,
    soldRecent: 10,
  },
  {
    href: '/games/pokemon-go/items/mega-bundle',
    title: 'Mega Trainer Bundle · 5 items',
    image: '/categories/items.svg',
    category: 'Items',
    gameTag: 'Pokémon GO',
    gameAccent: POGO_ACCENT,
    price: 2499,
    was: 3499,
    rating: 4.97,
    seller: SELLER.rohan,
    stockLeft: 4,
  },
];

export function PopularItems() {
  return (
    <ProductRail
      title="Popular Items"
      subtitle="Raid passes, balls, berries — delivered in one drop"
      viewAllHref="/games/pokemon-go/items"
      products={ITEMS}
    />
  );
}

/* --- Popular boosting services --- */
const BOOSTING: RailProduct[] = [
  {
    href: '/games/pokemon-go/boosting/master-league-rank',
    title: 'Master League Rank Push · GoBattle 2800+',
    image: '/categories/boosting.svg',
    category: 'Boosting',
    gameTag: 'Pokémon GO',
    gameAccent: POGO_ACCENT,
    price: 4200,
    was: 5500,
    rating: 4.95,
    badge: 'Reverse market',
    seller: SELLER.karan,
    stockLeft: 2,
  },
  {
    href: '/games/pokemon-go/boosting/raid-join-5star',
    title: '5★ Legendary Raid Join · Hosted',
    image: '/categories/boosting.svg',
    category: 'Boosting',
    gameTag: 'Pokémon GO',
    gameAccent: POGO_ACCENT,
    price: 199,
    rating: 4.97,
    seller: SELLER.arjun,
    soldRecent: 18,
  },
  {
    href: '/games/pokemon-go/boosting/shiny-hunt',
    title: 'Shiny Hunt · Event-exclusive · 1hr',
    image: '/categories/boosting.svg',
    category: 'Boosting',
    gameTag: 'Pokémon GO',
    gameAccent: POGO_ACCENT,
    price: 899,
    was: 1199,
    rating: 4.94,
    seller: SELLER.priya,
    endsIn: '2h 14m',
  },
  {
    href: '/games/pokemon-go/boosting/community-day',
    title: 'Community Day Grind · Full session',
    image: '/categories/boosting.svg',
    category: 'Boosting',
    gameTag: 'Pokémon GO',
    gameAccent: POGO_ACCENT,
    price: 1499,
    rating: 4.93,
    seller: SELLER.rohan,
    soldRecent: 3,
  },
  {
    href: '/games/pokemon-go/boosting/region-walk',
    title: 'Regional Walk · 25km coverage',
    image: '/categories/boosting.svg',
    category: 'Boosting',
    gameTag: 'Pokémon GO',
    gameAccent: POGO_ACCENT,
    price: 1099,
    was: 1399,
    rating: 4.92,
    badge: 'Hot',
    seller: SELLER.neha,
    stockLeft: 1,
  },
  {
    href: '/games/pokemon-go/boosting/elite-friend',
    title: 'Best Friend XP Push · 90 days',
    image: '/categories/boosting.svg',
    category: 'Boosting',
    gameTag: 'Pokémon GO',
    gameAccent: POGO_ACCENT,
    price: 2199,
    rating: 4.96,
    seller: SELLER.vikram,
    soldRecent: 4,
  },
];

export function PopularBoosting() {
  return (
    <ProductRail
      title="Popular Boosting"
      subtitle="Sellers bid on your job — pick the cheapest 5-star"
      viewAllHref="/games/pokemon-go/boosting"
      products={BOOSTING}
    />
  );
}
