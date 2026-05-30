/**
 * @deprecated AdminService has been split into focused domain services.
 * Import directly from the relevant service file instead:
 *
 *   AdminDashboardService → ./services/admin-dashboard.service
 *   AdminUserService      → ./services/admin-user.service
 *   AdminOrderService     → ./services/admin-order.service
 *   AdminContentService   → ./services/admin-content.service
 *   AdminFinanceService   → ./services/admin-finance.service
 *
 * Type re-exports are kept here for backward compatibility.
 */

export type { AdminUserList, AdminUserDetail } from './services/admin-user.service';
export type { AdminOrderListItem, AdminOrderDetail } from './services/admin-order.service';
export type { AdminListing, AdminReview } from './services/admin-content.service';
