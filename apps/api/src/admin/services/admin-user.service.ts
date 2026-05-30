import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@getx/database';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { ChatGateway } from '../../conversations/chat.gateway';
import { ListUsersDto, UserActionDto } from '../dto/admin.dto';

const USERS_LIST_SELECT = {
  id: true,
  email: true,
  username: true,
  name: true,
  country: true,
  role: true,
  status: true,
  isSeller: true,
  kycLevel: true,
  sellerRating: true,
  totalSales: true,
  totalReviews: true,
  sellerWallet: true,
  createdAt: true,
  lastLoginAt: true,
  emailVerified: true,
} satisfies Prisma.UserSelect;

const USER_DETAIL_SELECT = {
  id: true,
  email: true,
  username: true,
  name: true,
  displayName: true,
  avatar: true,
  bio: true,
  country: true,
  preferredCurrency: true,
  role: true,
  status: true,
  isSeller: true,
  sellerActivatedAt: true,
  sellerRating: true,
  buyerRating: true,
  totalSales: true,
  totalReviews: true,
  verifiedTier: true,
  rank: true,
  xp: true,
  kycLevel: true,
  kycStatus: true,
  kycProvider: true,
  kycSubmittedAt: true,
  kycVerifiedAt: true,
  kycRejectionReason: true,
  emailVerified: true,
  phoneVerified: true,
  marketingOptIn: true,
  loyaltyPoints: true,
  lifetimeLoyaltyPoints: true,
  buyerWallet: true,
  sellerWallet: true,
  pendingEarnings: true,
  totalEarned: true,
  banReason: true,
  bannedAt: true,
  bannedById: true,
  suspendedUntil: true,
  lastLoginAt: true,
  lastLoginIp: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      buyerOrders: true,
      sellerOrders: true,
      productListings: true,
      customRequests: true,
      sellerOffers: true,
    },
  },
} satisfies Prisma.UserSelect;

export type AdminUserList = Prisma.UserGetPayload<{ select: typeof USERS_LIST_SELECT }>;
export type AdminUserDetail = Prisma.UserGetPayload<{ select: typeof USER_DETAIL_SELECT }>;

@Injectable()
export class AdminUserService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private chat: ChatGateway,
  ) {}

  async listUsers(dto: ListUsersDto) {
    const where: Prisma.UserWhereInput = { deletedAt: null };
    if (dto.search) {
      where.OR = [
        { email: { contains: dto.search, mode: 'insensitive' } },
        { username: { contains: dto.search, mode: 'insensitive' } },
        { name: { contains: dto.search, mode: 'insensitive' } },
      ];
    }
    if (dto.status) where.status = dto.status;
    if (dto.role) where.role = dto.role;
    if (dto.isSeller !== undefined) where.isSeller = dto.isSeller;

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (dto.page - 1) * dto.limit,
        take: dto.limit,
        select: USERS_LIST_SELECT,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page: dto.page,
        limit: dto.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / dto.limit)),
      },
    };
  }

  async getUserDetail(userId: string): Promise<AdminUserDetail> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: USER_DETAIL_SELECT,
    });
    if (!user) throw new NotFoundException();
    return user;
  }

  async banUser(adminId: string, userId: string, dto: UserActionDto) {
    if (adminId === userId) throw new BadRequestException('Cannot ban yourself');

    const target = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, email: true },
    });
    if (!target) throw new NotFoundException();
    if (target.role === 'ADMIN' || target.role === 'SUPER_ADMIN') {
      throw new BadRequestException('Cannot ban another admin');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { status: 'BANNED', banReason: dto.reason, bannedAt: new Date(), bannedById: adminId },
      });
      await tx.productListing.updateMany({
        where: { sellerId: userId, status: 'ACTIVE' },
        data: { status: 'PAUSED' },
      });
      await tx.offer.updateMany({
        where: { sellerId: userId, status: 'PENDING' },
        data: { status: 'WITHDRAWN' },
      });
      await tx.customRequest.updateMany({
        where: { buyerId: userId, status: 'OPEN' },
        data: { status: 'CANCELLED' },
      });
      await tx.session.deleteMany({ where: { userId } });
      await tx.refreshToken.updateMany({
        where: { userId, revoked: false },
        data: { revoked: true, revokedAt: new Date() },
      });
    });

    this.chat.disconnectUser(userId);

    await this.audit.log({
      userId: adminId,
      action: 'admin.user_banned',
      entity: 'User',
      entityId: userId,
      metadata: { reason: dto.reason, targetEmail: target.email },
      severity: 'CRITICAL',
    });

    return { success: true };
  }

  async unbanUser(adminId: string, userId: string) {
    const target = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
    if (!target) throw new NotFoundException();

    await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'ACTIVE', banReason: null },
    });

    await this.audit.log({
      userId: adminId,
      action: 'admin.user_unbanned',
      entity: 'User',
      entityId: userId,
      metadata: { targetEmail: target.email },
      severity: 'WARNING',
    });

    return { success: true };
  }
}
