import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@getx/database';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateOfferDto } from './dto/create-offer.dto';

const MY_OFFERS_INCLUDE = {
  request: {
    select: {
      id: true,
      requestNumber: true,
      title: true,
      tabType: true,
      subCategory: true,
      status: true,
      game: { select: { slug: true, name: true } },
    },
  },
} satisfies Prisma.OfferInclude;

export type MyOffer = Prisma.OfferGetPayload<{
  include: typeof MY_OFFERS_INCLUDE;
}>;
export type OfferRow = Prisma.OfferGetPayload<object>;

@Injectable()
export class OffersService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async createOffer(sellerId: string, dto: CreateOfferDto): Promise<OfferRow> {
    const request = await this.prisma.customRequest.findUnique({
      where: { id: dto.requestId },
    });
    if (!request) throw new NotFoundException('Request not found');
    if (request.status !== 'OPEN') {
      throw new BadRequestException('Request not accepting offers');
    }
    if (request.expiresAt < new Date()) {
      throw new BadRequestException('Request expired');
    }
    if (request.buyerId === sellerId) {
      throw new BadRequestException('Cannot offer on your own request');
    }

    const seller = await this.prisma.user.findUnique({
      where: { id: sellerId },
      select: { isSeller: true, status: true },
    });
    if (!seller || !seller.isSeller || seller.status !== 'ACTIVE') {
      throw new ForbiddenException('Seller mode required');
    }

    if (dto.price > request.budgetMax * 1.5) {
      throw new BadRequestException(
        `Price too high. Buyer's max is $${request.budgetMax}`,
      );
    }

    try {
      const offer = await this.prisma.$transaction(async (tx) => {
        const newOffer = await tx.offer.create({
          data: {
            requestId: dto.requestId,
            sellerId,
            buyerId: request.buyerId,
            price: dto.price,
            currency: dto.currency,
            deliveryHours: dto.deliveryHours,
            message: dto.message,
            status: 'PENDING',
            expiresAt: request.expiresAt,
          },
        });

        await tx.customRequest.update({
          where: { id: dto.requestId },
          data: { offerCount: { increment: 1 } },
        });

        return newOffer;
      });

      await this.audit.log({
        userId: sellerId,
        action: 'offer.created',
        entity: 'Offer',
        entityId: offer.id,
        metadata: {
          requestId: dto.requestId,
          price: dto.price,
        },
      });

      return offer;
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code?: string }).code === 'P2002'
      ) {
        throw new ConflictException(
          'You already submitted an offer for this request',
        );
      }
      throw error;
    }
  }

  async withdrawOffer(sellerId: string, offerId: string): Promise<OfferRow> {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
    });
    if (!offer) throw new NotFoundException();
    if (offer.sellerId !== sellerId) throw new ForbiddenException();
    if (offer.status !== 'PENDING') {
      throw new BadRequestException('Cannot withdraw non-pending offer');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const o = await tx.offer.update({
        where: { id: offerId },
        data: { status: 'WITHDRAWN' },
      });
      await tx.customRequest.update({
        where: { id: offer.requestId },
        data: { offerCount: { decrement: 1 } },
      });
      return o;
    });

    await this.audit.log({
      userId: sellerId,
      action: 'offer.withdrawn',
      entity: 'Offer',
      entityId: offerId,
    });

    return updated;
  }

  async getMyOffers(sellerId: string): Promise<MyOffer[]> {
    return this.prisma.offer.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
      include: MY_OFFERS_INCLUDE,
    });
  }
}
