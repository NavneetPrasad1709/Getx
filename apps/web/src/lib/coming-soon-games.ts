import { User, Coins, Package, Sword, Crown, Zap, Gem, Trophy } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/* Coming-soon games — content for /games/[slug]/coming-soon pages.
 *
 * Each entry is the source of truth for what a visitor sees on that
 * game's pre-launch page: hero art, timeline, expected categories, and
 * a per-game glow hue that ties back to the homepage card. Waitlist
 * counts here are seed numbers; real counts come from the API once
 * wired up (POST /api/waitlist).
 */

export interface ComingSoonCategory {
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface ComingSoonGame {
  slug: string;
  name: string;
  poster: string;
  /** Short status tag, e.g. "In testing" or "Q3 2026". */
  timeline: string;
  /** Long-form expected launch line shown on the page. */
  expectedLine: string;
  /** Tagline shown under the title. */
  tagline: string;
  /** Glow hue 0-360 to match the homepage card. */
  glowHue: number;
  /** Seed waitlist count — replace with API result later. */
  waitlistSeed: number;
  /** What GETX will offer at launch (4 cells). */
  categories: ComingSoonCategory[];
}

export const COMING_SOON_GAMES: Record<string, ComingSoonGame> = {
  roblox: {
    slug: 'roblox',
    name: 'Roblox',
    poster: '/games/roblox/robolox.jpg',
    timeline: 'In testing',
    expectedLine: 'Currently in private beta with select sellers',
    tagline:
      'Robux top-ups, limited items, OG accounts, and trade-tracked Adopt Me / MM2 inventories — escrow-protected from day one.',
    glowHue: 0,
    waitlistSeed: 1247,
    categories: [
      { icon: User, title: 'OG Accounts', description: '2010-2016 vintage accounts with rare item history' },
      { icon: Coins, title: 'Robux Top-ups', description: 'Bulk Robux at marketplace rates, instant delivery' },
      { icon: Gem, title: 'Limited Items', description: 'Dominus, Sparkle Time, Valk hoods — verified ownership' },
      { icon: Package, title: 'Game Inventories', description: 'Adopt Me pets, MM2 knives, Pet Sim accounts' },
    ],
  },
  valorant: {
    slug: 'valorant',
    name: 'Valorant',
    poster: '/games/valorant/valorant.jpg',
    timeline: 'Q3 2026',
    expectedLine: 'Targeting July 2026 launch — full rank-boosting suite included',
    tagline:
      'Smurf accounts, Immortal+ ranks, full skin inventories, and Vanguard-safe boosting — all with the same escrow your Pokémon GO orders use.',
    glowHue: 350,
    waitlistSeed: 3892,
    categories: [
      { icon: Crown, title: 'Ranked Accounts', description: 'Immortal, Radiant, smurfs with full match history' },
      { icon: Gem, title: 'Premium Skins', description: 'Prime, Reaver, Glitchpop, Elderflame — full collections' },
      { icon: Zap, title: 'Rank Boosting', description: 'Vanguard-safe duo + solo boosting by Immortal+ players' },
      { icon: Coins, title: 'VP Top-ups', description: 'Valorant Points + Radianite at regional best rates' },
    ],
  },
  genshin: {
    slug: 'genshin',
    name: 'Genshin Impact',
    poster: '/games/genshin/genshin.jpg',
    timeline: 'Q3 2026',
    expectedLine: 'Targeting September 2026 — full HoYoverse account suite',
    tagline:
      'AR60 accounts with five-star rosters, Genesis Crystal top-ups, character/weapon builds, and Spiral Abyss boosting — escrow on every order.',
    glowHue: 195,
    waitlistSeed: 2156,
    categories: [
      { icon: User, title: 'Endgame Accounts', description: 'AR55-60 with C6 fives, R5 weapons, Abyss-cleared' },
      { icon: Gem, title: 'Character Builds', description: 'Specific characters with weapons + artifacts ready' },
      { icon: Coins, title: 'Genesis Crystals', description: 'Top-ups via verified payment rails, no ban risk' },
      { icon: Trophy, title: 'Abyss Boosting', description: '36-star Spiral Abyss clears + event speedruns' },
    ],
  },
};

export function getComingSoonGame(slug: string): ComingSoonGame | null {
  return COMING_SOON_GAMES[slug] ?? null;
}

export function listComingSoonGames(): ComingSoonGame[] {
  return Object.values(COMING_SOON_GAMES);
}
