import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { SavedSearch } from '@getx/database';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SavedSearchesService } from './saved-searches.service';
import {
  CreateSavedSearchSchema,
  UpdateSavedSearchSchema,
} from './dto/saved-search.dto';

@Controller('saved-searches')
export class SavedSearchesController {
  constructor(private svc: SavedSearchesService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser('id') userId: string,
    @Body() body: unknown,
  ): Promise<SavedSearch> {
    const dto = CreateSavedSearchSchema.parse(body);
    return this.svc.create(userId, dto);
  }

  @Get()
  list(@CurrentUser('id') userId: string): Promise<SavedSearch[]> {
    return this.svc.listMine(userId);
  }

  @Patch(':id')
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<SavedSearch> {
    const dto = UpdateSavedSearchSchema.parse(body);
    return this.svc.update(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ): Promise<{ success: true }> {
    return this.svc.remove(userId, id);
  }
}
