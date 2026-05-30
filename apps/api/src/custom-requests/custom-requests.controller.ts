import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import {
  CustomRequestsService,
  type CustomRequestDetail,
  type CustomRequestRow,
  type ListRequestsResponse,
  type MyRequest,
} from './custom-requests.service';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OptionalCurrentUser } from '../auth/decorators/optional-current-user.decorator';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CreateRequestSchema } from './dto/create-request.dto';
import { ListRequestsSchema } from './dto/list-requests.dto';

@Controller('custom-requests')
export class CustomRequestsController {
  constructor(private requests: CustomRequestsService) {}

  // RES-HIGH-014: add explicit throttle; @Public() so unauthenticated browsers
  // can browse the reverse marketplace.
  // RES-HIGH-017: @OptionalJwtAuthGuard extracts userId when present so the
  // `mine=true` filter works for authenticated users without requiring login
  // for public browsing.
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get()
  listRequests(
    @Query() query: unknown,
    @OptionalCurrentUser('id') userId: string | null,
  ): Promise<ListRequestsResponse> {
    const dto = ListRequestsSchema.parse(query);
    return this.requests.listRequests(dto, userId ?? undefined);
  }

  @Get('me/list')
  myRequests(@CurrentUser('id') userId: string): Promise<MyRequest[]> {
    return this.requests.getMyRequests(userId);
  }

  // RES-HIGH-015: add explicit throttle to limit enumeration.
  // RES-HIGH-018: @OptionalJwtAuthGuard extracts userId so the service can
  // skip viewCount increments when the buyer views their own request.
  // RES-HIGH-016: service filters non-public statuses for anonymous callers.
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Get(':id')
  getRequest(
    @Param('id') id: string,
    @OptionalCurrentUser('id') userId: string | null,
  ): Promise<CustomRequestDetail> {
    return this.requests.getRequest(id, userId ?? undefined);
  }

  @Post()
  @Throttle({ default: { limit: 10, ttl: 3_600_000 } })
  @HttpCode(HttpStatus.CREATED)
  createRequest(
    @CurrentUser('id') userId: string,
    @Body() body: unknown,
    @Req() req: Request,
  ): Promise<CustomRequestDetail> {
    const dto = CreateRequestSchema.parse(body);
    return this.requests.createRequest(userId, dto, req.ip);
  }

  @Patch(':id/cancel')
  cancelRequest(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ): Promise<CustomRequestRow> {
    return this.requests.cancelRequest(id, userId);
  }
}
