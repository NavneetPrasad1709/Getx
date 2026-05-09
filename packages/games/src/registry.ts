import type { BoostingService, GameConfig, TabConfig } from './types';
import { pokemonGoConfig } from './pokemon-go';
import { robloxConfig } from './roblox';

export const gameRegistry: Record<string, GameConfig> = {
  [pokemonGoConfig.slug]: pokemonGoConfig,
  [robloxConfig.slug]: robloxConfig,
};

export const allGames: GameConfig[] = Object.values(gameRegistry);

export const activeGames: GameConfig[] = allGames.filter((g) => g.isActive && g.isLaunched);

export function getGameBySlug(slug: string): GameConfig | undefined {
  return gameRegistry[slug];
}

export function getTabConfig(gameSlug: string, tabSlug: string): TabConfig | null {
  const game = getGameBySlug(gameSlug);
  if (!game) return null;
  return game.tabs.find((t) => t.slug === tabSlug) ?? null;
}

export function getServiceConfig(gameSlug: string, serviceSlug: string): BoostingService | null {
  const game = getGameBySlug(gameSlug);
  if (!game) return null;

  const boostingTab = game.tabs.find((t) => t.type === 'REVERSE');
  if (!boostingTab?.subServices) return null;

  return boostingTab.subServices.find((s) => s.slug === serviceSlug) ?? null;
}
