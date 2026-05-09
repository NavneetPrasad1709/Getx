import { Controller, Get, Param } from '@nestjs/common';
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
