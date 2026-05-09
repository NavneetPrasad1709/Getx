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
import { CreateRequestSchema } from './dto/create-request.dto';
import { ListRequestsSchema } from './dto/list-requests.dto';

@Controller('custom-requests')
export class CustomRequestsController {
  constructor(private requests: CustomRequestsService) {}

  @Public()
  @Get()
  listRequests(@Query() query: unknown): Promise<ListRequestsResponse> {
    const dto = ListRequestsSchema.parse(query);
    return this.requests.listRequests(dto);
  }

  @Get('me/list')
  myRequests(@CurrentUser('id') userId: string): Promise<MyRequest[]> {
    return this.requests.getMyRequests(userId);
  }

  @Public()
  @Get(':id')
  getRequest(@Param('id') id: string): Promise<CustomRequestDetail> {
    return this.requests.getRequest(id);
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
