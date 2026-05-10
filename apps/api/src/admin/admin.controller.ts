import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { Prisma } from '@getx/database';
import {
  AdminService,
  type AdminListing,
  type AdminOrderDetail,
  type AdminOrderListItem,
  type AdminReview,
  type AdminUserDetail,
  type AdminUserList,
} from './admin.service';
import {
  HideContentSchema,
  ListAuditLogsSchema,
  ListListingsSchema,
  ListOrdersSchema,
  ListReviewsSchema,
  ListUsersSchema,
  RefundOrderSchema,
  UserActionSchema,
} from './dto/admin.dto';

@Controller('admin')
@UseGuards(RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminController {
  constructor(private admin: AdminService) {}

  @Get('dashboard')
  dashboard() {
    return this.admin.getDashboard();
  }

  @Get('users')
  listUsers(@Query() query: unknown): Promise<{
    data: AdminUserList[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const dto = ListUsersSchema.parse(query);
    return this.admin.listUsers(dto);
  }

  @Get('users/:id')
  getUser(@Param('id') id: string): Promise<AdminUserDetail> {
    return this.admin.getUserDetail(id);
  }

  @Post('users/:id/ban')
  banUser(
    @CurrentUser('id') adminId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const dto = UserActionSchema.parse(body);
    return this.admin.banUser(adminId, id, dto);
  }

  @Post('users/:id/unban')
  unbanUser(@CurrentUser('id') adminId: string, @Param('id') id: string) {
    return this.admin.unbanUser(adminId, id);
  }

  @Get('orders')
  listOrders(@Query() query: unknown): Promise<{
    data: AdminOrderListItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const dto = ListOrdersSchema.parse(query);
    return this.admin.listOrders(dto);
  }

  @Get('orders/:id')
  getOrder(@Param('id') id: string): Promise<AdminOrderDetail> {
    return this.admin.getOrderDetail(id);
  }

  @Post('orders/:id/force-release')
  forceRelease(
    @CurrentUser('id') adminId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const dto = UserActionSchema.parse(body);
    return this.admin.forceReleaseEscrow(adminId, id, dto);
  }

  @Post('orders/:id/refund')
  refundOrder(
    @CurrentUser('id') adminId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const dto = RefundOrderSchema.parse(body);
    return this.admin.refundOrder(adminId, id, dto);
  }

  @Get('listings')
  listListings(@Query() query: unknown): Promise<{
    data: AdminListing[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const dto = ListListingsSchema.parse(query);
    return this.admin.listListings(dto);
  }

  @Post('listings/:id/hide')
  hideListing(
    @CurrentUser('id') adminId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const dto = HideContentSchema.parse(body);
    return this.admin.hideListing(adminId, id, dto);
  }

  @Post('listings/:id/unhide')
  unhideListing(@CurrentUser('id') adminId: string, @Param('id') id: string) {
    return this.admin.unhideListing(adminId, id);
  }

  @Get('reviews')
  listReviews(@Query() query: unknown): Promise<{
    data: AdminReview[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const dto = ListReviewsSchema.parse(query);
    return this.admin.listReviews(dto);
  }

  @Post('reviews/:id/hide')
  hideReview(
    @CurrentUser('id') adminId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const dto = HideContentSchema.parse(body);
    return this.admin.hideReview(adminId, id, dto);
  }

  @Get('audit-logs')
  listAuditLogs(@Query() query: unknown): Promise<{
    data: Prisma.AuditLogGetPayload<object>[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const dto = ListAuditLogsSchema.parse(query);
    return this.admin.listAuditLogs(dto);
  }
}
