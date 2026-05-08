import type { GameConfig } from '@getx/types';
import { pokemonGoConfig } from './pokemon-go';
import { robloxConfig } from './roblox';

export const gameRegistry: Record<string, GameConfig> = {
  [pokemonGoConfig.slug]: pokemonGoConfig,
  [robloxConfig.slug]: robloxConfig,
};

export function getActiveGames(): GameConfig[] {
  return Object.values(gameRegistry).filter((g) => g.isActive);
}

export function getGameBySlug(slug: string): GameConfig | undefined {
  return gameRegistry[slug];
}
