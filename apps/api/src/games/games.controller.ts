import { Controller, Get, Param, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';
import {
  GamesService,
  type BoostingSubService,
  type GameDetail,
  type GameListItem,
} from './games.service';

@Controller('games')
export class GamesController {
  constructor(private games: GamesService) {}

  @Public()
  @Get()
  listGames(): Promise<GameListItem[]> {
    return this.games.listGames();
  }

  /* Public federated game search — used by the /search page. Placed
     BEFORE the :slug route so "search" doesn't get matched as a slug. */
  @Public()
  @Get('search')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  searchGames(
    @Query('q') q: string,
    @Query('limit') limit?: string,
  ): Promise<GameListItem[]> {
    return this.games.searchGames(q, limit ? parseInt(limit, 10) : 6);
  }

  @Public()
  @Get(':slug')
  getGame(@Param('slug') slug: string): Promise<GameDetail> {
    return this.games.getGameBySlug(slug);
  }

  @Public()
  @Get(':gameSlug/services/:serviceSlug')
  getService(
    @Param('gameSlug') gameSlug: string,
    @Param('serviceSlug') serviceSlug: string,
  ): Promise<BoostingSubService> {
    return this.games.getServiceConfig(gameSlug, serviceSlug);
  }
}
