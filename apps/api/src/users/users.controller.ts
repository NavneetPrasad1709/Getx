import { Controller, Get, Param, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';
import { UsersService, type PublicProfile } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @Public()
  @Get('by-username/:username')
  getByUsername(@Param('username') username: string): Promise<PublicProfile> {
    return this.users.getByUsername(username);
  }

  /* Public seller search — federated query used by the /search page.
     Throttled to 30 hits per IP per minute to keep scraping costly. */
  @Public()
  @Get('search')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  search(
    @Query('q') q: string,
    @Query('limit') limit?: string,
  ): Promise<PublicProfile[]> {
    return this.users.searchSellers(q, limit ? parseInt(limit, 10) : 12);
  }

  /* Public top-100 leaderboard. Placed before the :id catch-all so
     "leaderboard" doesn't get matched as a user id. Throttled to keep
     a flood of refreshes off the DB. */
  @Public()
  @Get('leaderboard')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  leaderboard(): ReturnType<UsersService['getLeaderboard']> {
    return this.users.getLeaderboard();
  }

  /* One-click unsubscribe — public so the link in the email footer works
     without re-auth. Idempotent + no token-validity disclosure. */
  @Public()
  @Get('unsubscribe/:token')
  unsubscribe(
    @Param('token') token: string,
  ): Promise<{ alreadyOptedOut: boolean }> {
    return this.users.unsubscribeByToken(token);
  }

  @Public()
  @Get(':id')
  getById(@Param('id') id: string): Promise<PublicProfile> {
    return this.users.getById(id);
  }
}
