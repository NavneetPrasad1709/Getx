import { Controller, Get, Param } from '@nestjs/common';
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

  @Public()
  @Get(':id')
  getById(@Param('id') id: string): Promise<PublicProfile> {
    return this.users.getById(id);
  }
}
