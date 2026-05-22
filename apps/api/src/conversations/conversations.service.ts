import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@getx/database';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
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
  listing: {
    select: { id: true, title: true, slug: true, tabType: true },
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
  listing: {
    select: { id: true, title: true, slug: true, tabType: true },
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

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

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
    const recipientId = isBuyer ? conv.sellerId : conv.buyerId;

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

    // In-app notification only (no email — would spam on every chat).
    void this.notifications.create({
      userId: recipientId,
      type: 'NEW_MESSAGE',
      title: 'New message',
      message: dto.content.slice(0, 120),
      link: `/messages?id=${conv.id}`,
      metadata: { conversationId: conv.id, messageId: message.id },
      sendEmail: false,
    });

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
      take: 100,
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

  /* Pre-purchase chat — buyer messages a seller about a listing before
     creating an order. Returns the existing conversation if one already
     exists for this buyer+listing pair (so refreshing the page doesn't
     spawn dupes). Rate-limits enforced server-side:
       · Buyers with 0 completed orders: 1 new PRE_PURCHASE chat per 24h
         across the whole site (anti-spam for fresh accounts).
       · Everyone: 3 new PRE_PURCHASE chats per buyer-seller pair per 24h
         (limit pestering one seller).
     Self-chat is blocked. SPAM-flagged conversations don't return — buyer
     gets a fresh ForbiddenException so the seller's block is durable. */
  async openPrePurchaseChat(
    buyerId: string,
    listingId: string,
  ): Promise<ConversationDetail> {
    const listing = await this.prisma.productListing.findUnique({
      where: { id: listingId },
      select: { id: true, sellerId: true, title: true, status: true },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.status !== 'ACTIVE') {
      throw new BadRequestException('Listing not available for chat');
    }
    if (listing.sellerId === buyerId) {
      throw new BadRequestException("Can't message yourself");
    }

    /* Reuse existing pre-purchase conversation between this buyer and
       seller for this listing. */
    const existing = await this.prisma.conversation.findFirst({
      where: {
        type: 'PRE_PURCHASE',
        buyerId,
        sellerId: listing.sellerId,
        listingId,
      },
      include: DETAIL_INCLUDE,
    });
    if (existing) {
      if (existing.status === 'SPAM' || existing.status === 'BLOCKED') {
        throw new ForbiddenException(
          'Seller has blocked further pre-purchase messages',
        );
      }
      return existing;
    }

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    /* Buyer-seller pair cap: 3 fresh pre-purchase chats per 24h. */
    const recentForSeller = await this.prisma.conversation.count({
      where: {
        type: 'PRE_PURCHASE',
        buyerId,
        sellerId: listing.sellerId,
        createdAt: { gte: dayAgo },
      },
    });
    if (recentForSeller >= 3) {
      throw new ForbiddenException(
        'Daily pre-purchase chat limit reached for this seller',
      );
    }

    /* Fresh-account cap: 1 pre-purchase chat per 24h sitewide if buyer
       has never completed an order. */
    const completedOrders = await this.prisma.order.count({
      where: { buyerId, status: 'COMPLETED' },
    });
    if (completedOrders === 0) {
      const recentSitewide = await this.prisma.conversation.count({
        where: {
          type: 'PRE_PURCHASE',
          buyerId,
          createdAt: { gte: dayAgo },
        },
      });
      if (recentSitewide >= 1) {
        throw new ForbiddenException(
          'Complete an order before opening more pre-purchase chats',
        );
      }
    }

    const conversation = await this.prisma.conversation.create({
      data: {
        type: 'PRE_PURCHASE',
        buyerId,
        sellerId: listing.sellerId,
        listingId,
      },
      include: DETAIL_INCLUDE,
    });

    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: buyerId,
        type: 'SYSTEM',
        content: `Pre-purchase inquiry started about "${listing.title}". No order created yet.`,
        systemEvent: 'PRE_PURCHASE_OPENED',
        metadata: { listingId },
      },
    });

    /* In-app notification to seller — drives response time. */
    void this.notifications.create({
      userId: listing.sellerId,
      type: 'NEW_MESSAGE',
      title: 'Pre-purchase inquiry',
      message: `A buyer wants to chat about "${listing.title}"`,
      link: `/messages?id=${conversation.id}`,
      metadata: { conversationId: conversation.id, listingId },
      sendEmail: false,
    });

    return conversation;
  }

  /* Seller-only — mark a pre-purchase conversation as SPAM. Buyer is
     prevented from re-opening for the same listing. */
  async markConversationSpam(
    userId: string,
    conversationId: string,
  ): Promise<{ success: true }> {
    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { sellerId: true, type: true },
    });
    if (!conv) throw new NotFoundException();
    if (conv.sellerId !== userId) {
      throw new ForbiddenException('Only the seller can flag spam');
    }
    if (conv.type !== 'PRE_PURCHASE') {
      throw new BadRequestException('Only pre-purchase chats can be flagged');
    }
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { status: 'SPAM' },
    });
    return { success: true };
  }
}
