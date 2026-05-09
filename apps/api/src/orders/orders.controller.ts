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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
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
  getOrder(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ): Promise<OrderDetail> {
    return this.orders.getOrder(id, userId);
  }

  @Patch(':id/confirm-receipt')
  confirmReceipt(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.orders.confirmReceipt(id, userId);
  }

  @Patch(':id/mark-delivered')
  markDelivered(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: unknown,
  ): Promise<OrderRow> {
    const dto = MarkDeliveredSchema.parse(body);
    return this.orders.markDelivered(id, userId, dto);
  }
}
