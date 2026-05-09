import type { GameConfig } from './types';

export const robloxConfig: GameConfig = {
  slug: 'roblox',
  name: 'Roblox',
  description: 'The ultimate gaming universe. Coming to GETX week 2.',
  icon: 'https://cdn.getx.gg/games/roblox-icon.png',
  isActive: false,
  isLaunched: false,
  sortOrder: 2,
  customRequest: {
    enabled: true,
    maxImages: 5,
    minDescription: 50,
    requiredFields: ['title', 'description', 'budgetMin', 'budgetMax'],
  },
  // TBD before week-2 launch: Accounts (Robux balance, Premium status),
  // Robux currency packages, Limited items, Game pass services.
  tabs: [],
};
