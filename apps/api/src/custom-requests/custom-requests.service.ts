import { randomBytes } from 'node:crypto';
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import type { Prisma } from '@getx/database';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { ListRequestsDto } from './dto/list-requests.dto';

const LIST_SELECT = {
  id: true,
  requestNumber: true,
  tabType: true,
  subCategory: true,
  title: true,
  description: true,
  images: true,
  budgetMin: true,
  budgetMax: true,
  currency: true,
  attributes: true,
  deliveryDays: true,
  platform: true,
  status: true,
  expiresAt: true,
  viewCount: true,
  offerCount: true,
  createdAt: true,
  buyer: {
    select: {
      id: true,
      username: true,
      name: true,
      country: true,
      avatar: true,
    },
  },
  game: {
    select: { slug: true, name: true, icon: true },
  },
} satisfies Prisma.CustomRequestSelect;

const DETAIL_INCLUDE = {
  buyer: {
    select: {
      id: true,
      username: true,
      name: true,
      country: true,
      avatar: true,
      createdAt: true,
    },
  },
  game: {
    select: { slug: true, name: true, icon: true },
  },
  offers: {
    where: { status: { in: ['PENDING', 'ACCEPTED'] as const } },
    include: {
      seller: {
        select: {
          id: true,
          username: true,
          name: true,
          avatar: true,
          sellerRating: true,
          totalSales: true,
          completionRate: true,
          verifiedTier: true,
          country: true,
        },
      },
    },
    orderBy: { price: 'asc' as const },
  },
} satisfies Prisma.CustomRequestInclude;

const MY_LIST_INCLUDE = {
  game: { select: { slug: true, name: true, icon: true } },
  _count: { select: { offers: true } },
} satisfies Prisma.CustomRequestInclude;

export type CustomRequestListItem = Prisma.CustomRequestGetPayload<{
  select: typeof LIST_SELECT;
}>;
export type CustomRequestDetail = Prisma.CustomRequestGetPayload<{
  include: typeof DETAIL_INCLUDE;
}>;
export type MyRequest = Prisma.CustomRequestGetPayload<{
  include: typeof MY_LIST_INCLUDE;
}>;
export type CustomRequestRow = Prisma.CustomRequestGetPayload<object>;

export interface ListRequestsResponse {
  data: CustomRequestListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

@Injectable()
export class CustomRequestsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async createRequest(
    buyerId: string,
    dto: CreateRequestDto,
    ip?: string,
  ): Promise<CustomRequestDetail> {
    const game = await this.prisma.game.findUnique({
      where: { slug: dto.gameSlug },
    });
    if (!game) throw new NotFoundException(`Game not found: ${dto.gameSlug}`);
    if (!game.isActive) throw new BadRequestException('Game not available');

    // RES-MED-020: count+1 races under concurrent creates → P2002.
    // Use random hex suffix for collision resistance.
    const year = new Date().getFullYear();
    const requestNumber = `CR-${year}-${randomBytes(4).toString('hex').toUpperCase()}`;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const request = await this.prisma.customRequest.create({
      data: {
        requestNumber,
        buyerId,
        gameId: game.id,
        tabType: dto.tabType,
        subCategory: dto.subCategory,
        title: dto.title,
        description: dto.description,
        images: dto.images,
        budgetMin: dto.budgetMin,
        budgetMax: dto.budgetMax,
        currency: dto.currency,
        attributes: dto.attributes as Prisma.InputJsonValue,
        addons: dto.addons ?? {},
        deliveryDays: dto.deliveryDays,
        platform: dto.platform,
        expiresAt,
        status: 'OPEN',
      },
      include: DETAIL_INCLUDE,
    });

    await this.audit.log({
      userId: buyerId,
      action: 'request.created',
      entity: 'CustomRequest',
      entityId: request.id,
      metadata: {
        requestNumber,
        tabType: dto.tabType,
        subCategory: dto.subCategory,
        budgetMin: dto.budgetMin,
        budgetMax: dto.budgetMax,
      },
      ipAddress: ip,
    });

    return request;
  }

  async listRequests(
    filters: ListRequestsDto,
    currentUserId?: string,
  ): Promise<ListRequestsResponse> {
    const where: Prisma.CustomRequestWhereInput = {
      deletedAt: null,
    };

    if (filters.gameSlug) {
      where.game = { slug: filters.gameSlug };
    }
    if (filters.tabType) where.tabType = filters.tabType;
    if (filters.subCategory) where.subCategory = filters.subCategory;
    /* Text search across title + description. case-insensitive contains
       maps to PG ILIKE; trigram index on these columns lands in a
       follow-up if the row count ever justifies it. */
    if (filters.q) {
      where.OR = [
        { title: { contains: filters.q, mode: 'insensitive' } },
        { description: { contains: filters.q, mode: 'insensitive' } },
      ];
    }

    if (filters.mine) {
      if (!currentUserId) {
        throw new ForbiddenException('Login required for mine filter');
      }
      where.buyerId = currentUserId;
      if (filters.status) where.status = filters.status;
    } else if (filters.status) {
      where.status = filters.status;
    } else {
      where.status = 'OPEN';
    }

    const orderBy: Prisma.CustomRequestOrderByWithRelationInput = (() => {
      switch (filters.sort) {
        case 'budget-high':
          return { budgetMax: 'desc' };
        case 'budget-low':
          return { budgetMin: 'asc' };
        case 'expiring-soon':
          return { expiresAt: 'asc' };
        case 'newest':
        default:
          return { createdAt: 'desc' };
      }
    })();

    const skip = (filters.page - 1) * filters.limit;

    const [data, total] = await Promise.all([
      this.prisma.customRequest.findMany({
        where,
        orderBy,
        skip,
        take: filters.limit,
        select: LIST_SELECT,
      }),
      this.prisma.customRequest.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / filters.limit)),
        hasNext: filters.page * filters.limit < total,
        hasPrev: filters.page > 1,
      },
    };
  }

  // Statuses visible to unauthenticated callers. Buyers can see their
  // own cancelled/expired/disputed requests via GET /me/list instead.
  private static readonly PUBLIC_STATUSES = new Set([
    'OPEN',
    'AWAITING_CHOICE',
    'IN_PROGRESS',
    'DELIVERED',
  ]);

  async getRequest(
    id: string,
    currentUserId?: string,
  ): Promise<CustomRequestDetail> {
    const request = await this.prisma.customRequest.findUnique({
      where: { id },
      include: DETAIL_INCLUDE,
    });

    if (!request) throw new NotFoundException('Request not found');
    if (request.deletedAt) throw new NotFoundException('Request removed');

    // RES-HIGH-016: hide CANCELLED / EXPIRED / DISPUTED from anonymous callers.
    // Authenticated buyers can still view their own request in any status.
    const isBuyer = currentUserId && currentUserId === request.buyerId;
    if (
      !isBuyer &&
      !CustomRequestsService.PUBLIC_STATUSES.has(request.status)
    ) {
      throw new NotFoundException('Request not found');
    }

    // RES-HIGH-018: only increment viewCount for non-buyer callers.
    if (currentUserId !== request.buyerId) {
      void this.prisma.customRequest
        .update({
          where: { id },
          data: { viewCount: { increment: 1 } },
        })
        .catch(() => {
          /* best-effort */
        });
    }

    return request;
  }

  async cancelRequest(id: string, userId: string): Promise<CustomRequestRow> {
    const request = await this.prisma.customRequest.findUnique({
      where: { id },
    });

    if (!request) throw new NotFoundException();
    if (request.buyerId !== userId) {
      throw new ForbiddenException('Not your request');
    }
    if (request.status !== 'OPEN' && request.status !== 'AWAITING_CHOICE') {
      throw new BadRequestException('Cannot cancel request in current status');
    }

    const updated = await this.prisma.customRequest.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    await this.prisma.offer.updateMany({
      where: { requestId: id, status: 'PENDING' },
      data: { status: 'WITHDRAWN' },
    });

    await this.audit.log({
      userId,
      action: 'request.cancelled',
      entity: 'CustomRequest',
      entityId: id,
      metadata: { requestNumber: request.requestNumber },
    });

    return updated;
  }

  async getMyRequests(buyerId: string): Promise<MyRequest[]> {
    return this.prisma.customRequest.findMany({
      where: { buyerId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: MY_LIST_INCLUDE,
    });
  }
}
