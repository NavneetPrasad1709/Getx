import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@getx/database';
import { PrismaService } from '../prisma/prisma.service';

export interface BoostingSubService {
  slug: string;
  name?: string;
  formFields?: unknown;
  addons?: unknown;
  [k: string]: unknown;
}
interface TabFromConfig {
  slug?: string;
  type?: string;
  subServices?: BoostingSubService[];
}
interface FieldsConfig {
  tabs?: TabFromConfig[];
  [k: string]: unknown;
}

const LIST_GAME_SELECT = {
  id: true,
  slug: true,
  name: true,
  shortName: true,
  description: true,
  icon: true,
  banner: true,
  isLaunched: true,
  comingSoonAt: true,
  totalListings: true,
  totalSellers: true,
  sortOrder: true,
} satisfies Prisma.GameSelect;

const DETAIL_GAME_SELECT = {
  id: true,
  slug: true,
  name: true,
  shortName: true,
  description: true,
  icon: true,
  banner: true,
  isActive: true,
  isLaunched: true,
  comingSoonAt: true,
  sortOrder: true,
  seoTitle: true,
  seoDescription: true,
  fieldsConfig: true,
  totalListings: true,
  totalOrders: true,
  totalSellers: true,
  createdAt: true,
} satisfies Prisma.GameSelect;

export type GameListItem = Prisma.GameGetPayload<{
  select: typeof LIST_GAME_SELECT;
}>;
export type GameDetail = Prisma.GameGetPayload<{
  select: typeof DETAIL_GAME_SELECT;
}>;

@Injectable()
export class GamesService {
  constructor(private prisma: PrismaService) {}

  listGames(): Promise<GameListItem[]> {
    return this.prisma.game.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: LIST_GAME_SELECT,
    });
  }

  async getGameBySlug(slug: string): Promise<GameDetail> {
    const game = await this.prisma.game.findUnique({
      where: { slug },
      select: DETAIL_GAME_SELECT,
    });

    if (!game) throw new NotFoundException(`Game not found: ${slug}`);
    if (!game.isActive) throw new NotFoundException('Game not available');

    return game;
  }

  async getServiceConfig(
    gameSlug: string,
    serviceSlug: string,
  ): Promise<BoostingSubService> {
    const game = await this.getGameBySlug(gameSlug);
    const config = game.fieldsConfig as FieldsConfig;

    const boostingTab = config.tabs?.find((t) => t.type === 'REVERSE');
    if (!boostingTab?.subServices) {
      throw new NotFoundException('No services for this game');
    }

    const service = boostingTab.subServices.find((s) => s.slug === serviceSlug);
    if (!service) {
      throw new NotFoundException(`Service not found: ${serviceSlug}`);
    }

    return service;
  }
}
