import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@getx/database';
import { PrismaService } from '../prisma/prisma.service';
import {
  ListMessagesDto,
  SendMessageDto,
  StartConversationDto,
} from './dto/send-message.dto';

const DETAIL_INCLUDE = {
  buyer: { select: { id: true, name: true, username: true, avatar: true } },
  seller: { select: { id: true, name: true, username: true, avatar: true } },
  order: {
    select: { id: true, orderNumber: true, status: true },
  },
  offer: {
    select: {
      id: true,
      request: { select: { id: true, requestNumber: true, title: true } },
    },
  },
} satisfies Prisma.ConversationInclude;

const LIST_INCLUDE = {
  buyer: { select: { id: true, name: true, username: true, avatar: true } },
  seller: { select: { id: true, name: true, username: true, avatar: true } },
  order: { select: { id: true, orderNumber: true, status: true } },
  offer: {
    select: {
      id: true,
      request: { select: { id: true, requestNumber: true, title: true } },
    },
  },
} satisfies Prisma.ConversationInclude;

const MESSAGE_INCLUDE = {
  sender: { select: { id: true, name: true, username: true, avatar: true } },
} satisfies Prisma.MessageInclude;

export type ConversationDetail = Prisma.ConversationGetPayload<{
  include: typeof DETAIL_INCLUDE;
}>;
export type ConversationListItem = Prisma.ConversationGetPayload<{
  include: typeof LIST_INCLUDE;
}>;
export type MessageRow = Prisma.MessageGetPayload<{
  include: typeof MESSAGE_INCLUDE;
}>;

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(private prisma: PrismaService) {}

  async getOrCreateConversation(
    userId: string,
    dto: StartConversationDto,
  ): Promise<ConversationDetail> {
    if (dto.orderId) {
      return this.getOrCreateOrderConversation(userId, dto.orderId);
    }
    if (dto.offerId) {
      return this.getOrCreateOfferConversation(userId, dto.offerId);
    }
    throw new BadRequestException('orderId or offerId required');
  }

  private async getOrCreateOrderConversation(
    userId: string,
    orderId: string,
  ): Promise<ConversationDetail> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        buyerId: true,
        sellerId: true,
        orderNumber: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.buyerId !== userId && order.sellerId !== userId) {
      throw new ForbiddenException('Not your order');
    }

    const existing = await this.prisma.conversation.findUnique({
      where: { orderId },
      include: DETAIL_INCLUDE,
    });
    if (existing) return existing;

    const conversation = await this.prisma.conversation.create({
      data: {
        orderId,
        buyerId: order.buyerId,
        sellerId: order.sellerId,
      },
      include: DETAIL_INCLUDE,
    });

    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: order.buyerId,
        type: 'SYSTEM',
        content: `Order ${order.orderNumber} chat opened. Coordinate delivery here.`,
        systemEvent: 'CONVERSATION_STARTED',
      },
    });

    return conversation;
  }

  private async getOrCreateOfferConversation(
    userId: string,
    offerId: string,
  ): Promise<ConversationDetail> {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      select: {
        id: true,
        buyerId: true,
        sellerId: true,
        request: { select: { requestNumber: true } },
      },
    });
    if (!offer) throw new NotFoundException('Offer not found');
    if (offer.buyerId !== userId && offer.sellerId !== userId) {
      throw new ForbiddenException('Not your offer');
    }

    const existing = await this.prisma.conversation.findUnique({
      where: { offerId },
      include: DETAIL_INCLUDE,
    });
    if (existing) return existing;

    const conversation = await this.prisma.conversation.create({
      data: {
        offerId,
        buyerId: offer.buyerId,
        sellerId: offer.sellerId,
      },
      include: DETAIL_INCLUDE,
    });

    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: offer.buyerId,
        type: 'SYSTEM',
        content: `Conversation started about request ${offer.request.requestNumber}.`,
        systemEvent: 'CONVERSATION_STARTED',
      },
    });

    return conversation;
  }

  async sendMessage(userId: string, dto: SendMessageDto): Promise<MessageRow> {
    const conv = await this.prisma.conversation.findUnique({
      where: { id: dto.conversationId },
      select: { id: true, buyerId: true, sellerId: true, status: true },
    });
    if (!conv) throw new NotFoundException();
    if (conv.buyerId !== userId && conv.sellerId !== userId) {
      throw new ForbiddenException('Not your conversation');
    }
    if (conv.status !== 'ACTIVE') {
      throw new BadRequestException('Conversation closed');
    }

    const isBuyer = conv.buyerId === userId;
    const otherUnreadField = isBuyer ? 'sellerUnread' : 'buyerUnread';

    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: {
          conversationId: dto.conversationId,
          senderId: userId,
          type: dto.type,
          content: dto.content,
          attachments: dto.attachments,
        },
        include: MESSAGE_INCLUDE,
      }),
      this.prisma.conversation.update({
        where: { id: dto.conversationId },
        data: {
          lastMessageAt: new Date(),
          lastMessageText: dto.content.slice(0, 200),
          [otherUnreadField]: { increment: 1 },
        },
      }),
    ]);

    return message;
  }

  async markAsRead(
    userId: string,
    conversationId: string,
  ): Promise<{ success: true }> {
    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { buyerId: true, sellerId: true },
    });
    if (!conv) throw new NotFoundException();
    if (conv.buyerId !== userId && conv.sellerId !== userId) {
      throw new ForbiddenException();
    }

    const unreadField =
      conv.buyerId === userId ? 'buyerUnread' : 'sellerUnread';

    await this.prisma.$transaction([
      this.prisma.message.updateMany({
        where: {
          conversationId,
          senderId: { not: userId },
          readAt: null,
          deletedAt: null,
        },
        data: { readAt: new Date() },
      }),
      this.prisma.conversation.update({
        where: { id: conversationId },
        data: { [unreadField]: 0 },
      }),
    ]);

    return { success: true };
  }

  async listMyConversations(userId: string): Promise<ConversationListItem[]> {
    return this.prisma.conversation.findMany({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
        status: 'ACTIVE',
      },
      orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
      include: LIST_INCLUDE,
    });
  }

  async getConversation(
    userId: string,
    id: string,
  ): Promise<ConversationDetail> {
    const conv = await this.prisma.conversation.findUnique({
      where: { id },
      include: DETAIL_INCLUDE,
    });
    if (!conv) throw new NotFoundException();
    if (conv.buyerId !== userId && conv.sellerId !== userId) {
      throw new ForbiddenException();
    }
    return conv;
  }

  async listMessages(
    userId: string,
    dto: ListMessagesDto,
  ): Promise<MessageRow[]> {
    const conv = await this.prisma.conversation.findUnique({
      where: { id: dto.conversationId },
      select: { buyerId: true, sellerId: true },
    });
    if (!conv) throw new NotFoundException();
    if (conv.buyerId !== userId && conv.sellerId !== userId) {
      throw new ForbiddenException();
    }

    const cursor = dto.before ? { id: dto.before } : undefined;

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId: dto.conversationId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      take: dto.limit,
      ...(cursor ? { skip: 1, cursor } : {}),
      include: MESSAGE_INCLUDE,
    });

    return messages.reverse();
  }

  async sendSystemMessage(params: {
    orderId?: string;
    offerId?: string;
    event: string;
    content: string;
    metadata?: Prisma.InputJsonValue;
  }): Promise<MessageRow | null> {
    const where = params.orderId
      ? { orderId: params.orderId }
      : params.offerId
        ? { offerId: params.offerId }
        : null;
    if (!where) return null;

    const conv = await this.prisma.conversation.findUnique({
      where,
      select: { id: true, buyerId: true },
    });
    if (!conv) {
      this.logger.debug(
        `No conversation found for system message: ${JSON.stringify(where)}`,
      );
      return null;
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId: conv.id,
        senderId: conv.buyerId,
        type: 'SYSTEM',
        content: params.content,
        systemEvent: params.event,
        metadata: params.metadata,
      },
      include: MESSAGE_INCLUDE,
    });

    await this.prisma.conversation.update({
      where: { id: conv.id },
      data: {
        lastMessageAt: new Date(),
        lastMessageText: params.content.slice(0, 200),
      },
    });

    return message;
  }

  async isParticipant(
    userId: string,
    conversationId: string,
  ): Promise<boolean> {
    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { buyerId: true, sellerId: true },
    });
    if (!conv) return false;
    return conv.buyerId === userId || conv.sellerId === userId;
  }
}
