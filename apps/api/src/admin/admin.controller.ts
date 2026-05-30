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
import { RequireStepUp } from '../auth/decorators/require-step-up.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { Prisma } from '@getx/database';
import {
  HideContentSchema,
  ListAuditLogsSchema,
  ListListingsSchema,
  ListOrdersSchema,
  ListReviewsSchema,
  ListUsersSchema,
  RefundOrderSchema,
  RejectWithdrawalSchema,
  ResolveDisputeSchema,
  UserActionSchema,
  WithdrawalActionSchema,
} from './dto/admin.dto';
import { AdminDashboardService } from './services/admin-dashboard.service';
import {
  AdminUserService,
  type AdminUserDetail,
  type AdminUserList,
} from './services/admin-user.service';
import {
  AdminOrderService,
  type AdminOrderDetail,
  type AdminOrderListItem,
} from './services/admin-order.service';
import {
  AdminContentService,
  type AdminListing,
  type AdminReview,
} from './services/admin-content.service';
import { AdminFinanceService } from './services/admin-finance.service';

@Controller('admin')
@UseGuards(RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminController {
  constructor(
    private dashboardSvc: AdminDashboardService,
    private usersSvc: AdminUserService,
    private ordersSvc: AdminOrderService,
    private contentSvc: AdminContentService,
    private financeSvc: AdminFinanceService,
  ) {}

  // ── Dashboard ──────────────────────────────────────────────────────────────

  @Get('dashboard')
  getDashboard() {
    return this.dashboardSvc.getDashboard();
  }

  @Get('alerts-counts')
  alertsCounts() {
    return this.dashboardSvc.getAlertsCounts();
  }

  // ── Users ──────────────────────────────────────────────────────────────────

  @Get('users')
  listUsers(@Query() query: unknown): Promise<{
    data: AdminUserList[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const dto = ListUsersSchema.parse(query);
    return this.usersSvc.listUsers(dto);
  }

  @Get('users/:id')
  getUser(@Param('id') id: string): Promise<AdminUserDetail> {
    return this.usersSvc.getUserDetail(id);
  }

  @Post('users/:id/ban')
  @RequireStepUp()
  banUser(
    @CurrentUser('id') adminId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const dto = UserActionSchema.parse(body);
    return this.usersSvc.banUser(adminId, id, dto);
  }

  @Post('users/:id/unban')
  unbanUser(@CurrentUser('id') adminId: string, @Param('id') id: string) {
    return this.usersSvc.unbanUser(adminId, id);
  }

  // ── Orders ─────────────────────────────────────────────────────────────────

  @Get('orders')
  listOrders(@Query() query: unknown): Promise<{
    data: AdminOrderListItem[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const dto = ListOrdersSchema.parse(query);
    return this.ordersSvc.listOrders(dto);
  }

  @Get('orders/:id')
  getOrder(@Param('id') id: string): Promise<AdminOrderDetail> {
    return this.ordersSvc.getOrderDetail(id);
  }

  @Post('orders/:id/force-release')
  @RequireStepUp()
  forceRelease(
    @CurrentUser('id') adminId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const dto = UserActionSchema.parse(body);
    return this.ordersSvc.forceReleaseEscrow(adminId, id, dto);
  }

  @Post('orders/:id/refund')
  @RequireStepUp()
  refundOrder(
    @CurrentUser('id') adminId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const dto = RefundOrderSchema.parse(body);
    return this.ordersSvc.refundOrder(adminId, id, dto);
  }

  // ── Disputes ───────────────────────────────────────────────────────────────

  @Post('disputes/:id/resolve')
  @RequireStepUp()
  resolveDispute(
    @CurrentUser('id') adminId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const dto = ResolveDisputeSchema.parse(body);
    return this.ordersSvc.resolveDispute(adminId, id, dto);
  }

  // ── Listings ───────────────────────────────────────────────────────────────

  @Get('listings')
  listListings(@Query() query: unknown): Promise<{
    data: AdminListing[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const dto = ListListingsSchema.parse(query);
    return this.contentSvc.listListings(dto);
  }

  @Post('listings/:id/hide')
  hideListing(
    @CurrentUser('id') adminId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const dto = HideContentSchema.parse(body);
    return this.contentSvc.hideListing(adminId, id, dto);
  }

  @Post('listings/:id/unhide')
  unhideListing(@CurrentUser('id') adminId: string, @Param('id') id: string) {
    return this.contentSvc.unhideListing(adminId, id);
  }

  // ── Reviews ────────────────────────────────────────────────────────────────

  @Get('reviews')
  listReviews(@Query() query: unknown): Promise<{
    data: AdminReview[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const dto = ListReviewsSchema.parse(query);
    return this.contentSvc.listReviews(dto);
  }

  @Post('reviews/:id/hide')
  hideReview(
    @CurrentUser('id') adminId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const dto = HideContentSchema.parse(body);
    return this.contentSvc.hideReview(adminId, id, dto);
  }

  // ── Audit Logs ─────────────────────────────────────────────────────────────

  @Get('audit-logs')
  listAuditLogs(@Query() query: unknown): Promise<{
    data: Prisma.AuditLogGetPayload<object>[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const dto = ListAuditLogsSchema.parse(query);
    return this.contentSvc.listAuditLogs(dto);
  }

  // ── Finance ────────────────────────────────────────────────────────────────

  @Get('withdrawals')
  listWithdrawals(@Query('status') status?: string) {
    return this.financeSvc.listWithdrawals(status);
  }

  @Post('withdrawals/:id/approve')
  @RequireStepUp()
  approveWithdrawal(
    @CurrentUser('id') adminId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const dto = WithdrawalActionSchema.parse(body ?? {});
    return this.financeSvc.approveWithdrawal(adminId, id, dto);
  }

  @Post('withdrawals/:id/reject')
  @RequireStepUp()
  rejectWithdrawal(
    @CurrentUser('id') adminId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const dto = RejectWithdrawalSchema.parse(body);
    return this.financeSvc.rejectWithdrawal(adminId, id, dto);
  }
}
