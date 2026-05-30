import { Injectable } from '@nestjs/common';
import type { Prisma } from '@getx/database';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminDashboardService {
  constructor(private prisma: PrismaService) {}

  async getAlertsCounts(): Promise<{
    disputes: number;
    pendingListings: number;
    removedListings: number;
    hiddenReviews: number;
  }> {
    const [disputes, pendingListings, removedListings, hiddenReviews] =
      await Promise.all([
        this.prisma.order.count({ where: { status: 'DISPUTED' } }),
        this.prisma.productListing.count({
          where: { status: 'PENDING_REVIEW', deletedAt: null },
        }),
        this.prisma.productListing.count({
          where: { status: 'REMOVED', deletedAt: null },
        }),
        this.prisma.review.count({ where: { isHidden: true } }),
      ]);
    return { disputes, pendingListings, removedListings, hiddenReviews };
  }

  async getDashboard() {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const PAID_LIKE: Prisma.OrderWhereInput['status'] = {
      in: ['PAID', 'IN_PROGRESS', 'DELIVERED', 'CONFIRMED', 'COMPLETED'],
    };

    // Batched to respect connection-pool limits under PgBouncer.
    const [totalUsers, newUsersWeek, activeSellers] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { createdAt: { gte: weekAgo }, deletedAt: null } }),
      this.prisma.user.count({ where: { isSeller: true, status: 'ACTIVE' } }),
    ]);

    const [totalListings, activeListings] = await Promise.all([
      this.prisma.productListing.count({ where: { deletedAt: null } }),
      this.prisma.productListing.count({ where: { status: 'ACTIVE', deletedAt: null } }),
    ]);

    const [totalOrders, ordersWeek] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.count({ where: { createdAt: { gte: weekAgo } } }),
    ]);

    const [gmvAllTime, gmvWeek] = await Promise.all([
      this.prisma.order.aggregate({ _sum: { buyerTotal: true }, where: { status: PAID_LIKE } }),
      this.prisma.order.aggregate({ _sum: { buyerTotal: true }, where: { status: PAID_LIKE, createdAt: { gte: weekAgo } } }),
    ]);

    const [revenueAllTime, revenueWeek] = await Promise.all([
      this.prisma.order.aggregate({ _sum: { buyerFee: true, sellerCommission: true }, where: { status: 'COMPLETED' } }),
      this.prisma.order.aggregate({ _sum: { buyerFee: true, sellerCommission: true }, where: { status: 'COMPLETED', createdAt: { gte: weekAgo } } }),
    ]);

    const [pendingPayouts, totalReviews, recentAudits] = await Promise.all([
      this.prisma.user.aggregate({ _sum: { sellerWallet: true } }),
      this.prisma.review.count({ where: { isHidden: false } }),
      this.prisma.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: { id: true, action: true, userId: true, entity: true, entityId: true, severity: true, createdAt: true },
      }),
    ]);

    const revWeek =
      (revenueWeek._sum.buyerFee?.toNumber() ?? 0) +
      (revenueWeek._sum.sellerCommission?.toNumber() ?? 0);
    const revAll =
      (revenueAllTime._sum.buyerFee?.toNumber() ?? 0) +
      (revenueAllTime._sum.sellerCommission?.toNumber() ?? 0);

    return {
      users: { total: totalUsers, newThisWeek: newUsersWeek, activeSellers },
      listings: { total: totalListings, active: activeListings },
      orders: { total: totalOrders, thisWeek: ordersWeek },
      gmv: { allTime: gmvAllTime._sum.buyerTotal ?? 0, thisWeek: gmvWeek._sum.buyerTotal ?? 0 },
      revenue: { allTime: revAll, thisWeek: revWeek },
      pendingPayouts: pendingPayouts._sum.sellerWallet ?? 0,
      totalReviews,
      recentAudits,
    };
  }
}
