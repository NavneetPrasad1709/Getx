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
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { safeImageUrl } from '../common/validators/safe-url';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireOwnership } from '../auth/decorators/require-ownership.decorator';
import {
  OrdersService,
  type OrderDetail,
  type OrderListItem,
  type OrderRow,
} from './orders.service';
import {
  CreateOrderFromListingSchema,
  CreateOrderFromOfferSchema,
  MarkDeliveredSchema,
} from './dto/create-order.dto';

const OpenDisputeSchema = z.object({
  reason: z.enum([
    'NOT_DELIVERED',
    'WRONG_ITEM',
    'ACCOUNT_RECOVERED',
    'FRAUDULENT',
    'POOR_QUALITY',
    'COMMUNICATION_ISSUE',
    'OTHER',
  ]),
  description: z.string().min(30, 'At least 30 characters').max(2000),
  evidence: z.array(safeImageUrl()).max(5).default([]),
});

@Controller('orders')
export class OrdersController {
  constructor(private orders: OrdersService) {}

  @Get('me/list')
  myOrders(
    @CurrentUser('id') userId: string,
    @Query('role') role: 'buyer' | 'seller' | 'all' = 'all',
  ): Promise<OrderListItem[]> {
    return this.orders.listMyOrders(userId, role);
  }

  @Post('from-listing')
  @Throttle({ default: { limit: 30, ttl: 3_600_000 } })
  @HttpCode(HttpStatus.CREATED)
  createFromListing(
    @CurrentUser('id') userId: string,
    @Body() body: unknown,
  ): Promise<OrderRow> {
    const dto = CreateOrderFromListingSchema.parse(body);
    return this.orders.createFromListing(userId, dto);
  }

  @Post('from-offer')
  @Throttle({ default: { limit: 30, ttl: 3_600_000 } })
  @HttpCode(HttpStatus.CREATED)
  createFromOffer(
    @CurrentUser('id') userId: string,
    @Body() body: unknown,
  ): Promise<OrderRow> {
    const dto = CreateOrderFromOfferSchema.parse(body);
    return this.orders.createFromOffer(userId, dto);
  }

  @Get(':id')
  @RequireOwnership('order')
  getOrder(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ): Promise<OrderDetail> {
    return this.orders.getOrder(id, userId);
  }

  @Patch(':id/confirm-receipt')
  @RequireOwnership('order')
  confirmReceipt(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.orders.confirmReceipt(id, userId);
  }

  @Patch(':id/mark-delivered')
  @RequireOwnership('order')
  markDelivered(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: unknown,
  ): Promise<OrderRow> {
    const dto = MarkDeliveredSchema.parse(body);
    return this.orders.markDelivered(id, userId, dto);
  }

  @Post(':id/reorder')
  @RequireOwnership('order')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.CREATED)
  reorder(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ): Promise<{ orderId: string }> {
    return this.orders.reorder(userId, id);
  }

  @Post(':id/dispute')
  @RequireOwnership('order')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.CREATED)
  openDispute(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: unknown,
  ): Promise<{ id: string; disputeNumber: string }> {
    const dto = OpenDisputeSchema.parse(body);
    return this.orders.openDispute(userId, id, dto);
  }
}
