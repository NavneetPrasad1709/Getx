import { Controller, Get, Header, Param, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';
import {
  GamesService,
  type BoostingSubService,
  type GameDetail,
  type GameListItem,
} from './games.service';

// PERF-013: genuinely public, near-immutable reads — let the Vercel proxy/CDN
// absorb them. Authed endpoints deliberately omit this and stay no-store.
const PUBLIC_CACHE = 'public, max-age=30, s-maxage=60, stale-while-revalidate=300';

@Controller('games')
export class GamesController {
  constructor(private games: GamesService) {}

  @Public()
  @Get()
  @Header('Cache-Control', PUBLIC_CACHE)
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
  @Header('Cache-Control', PUBLIC_CACHE)
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
