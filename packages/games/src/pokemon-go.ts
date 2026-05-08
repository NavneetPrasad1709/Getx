import type { GameConfig, ListingType } from '@getx/types';

export interface GameTab {
  slug: string;
  name: string;
  type: ListingType;
}

export interface ExtendedGameConfig extends GameConfig {
  tabs: GameTab[];
}

export const pokemonGoConfig: ExtendedGameConfig = {
  slug: 'pokemon-go',
  name: 'Pokemon GO',
  icon: '🎮',
  isActive: true,
  tabs: [
    { slug: 'accounts', name: 'Accounts', type: 'BROWSE' },
    { slug: 'top-ups', name: 'Top Ups', type: 'BROWSE' },
    { slug: 'items', name: 'Items', type: 'BROWSE' },
    { slug: 'boosting', name: 'Boosting', type: 'REVERSE' },
  ],
};
