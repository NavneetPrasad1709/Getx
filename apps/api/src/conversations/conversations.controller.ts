import {
  BadRequestException,
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
  ConversationsService,
  type ConversationDetail,
  type ConversationListItem,
  type MessageRow,
} from './conversations.service';
import {
  ListMessagesSchema,
  SendMessageSchema,
  StartConversationSchema,
} from './dto/send-message.dto';

@Controller('conversations')
export class ConversationsController {
  constructor(private convs: ConversationsService) {}

  @Get('me/list')
  myConversations(
    @CurrentUser('id') userId: string,
  ): Promise<ConversationListItem[]> {
    return this.convs.listMyConversations(userId);
  }

  @Post()
  startConversation(
    @CurrentUser('id') userId: string,
    @Body() body: unknown,
  ): Promise<ConversationDetail> {
    const dto = StartConversationSchema.parse(body);
    return this.convs.getOrCreateConversation(userId, dto);
  }

  @Get(':id')
  getConversation(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ): Promise<ConversationDetail> {
    return this.convs.getConversation(userId, id);
  }

  @Get(':id/messages')
  listMessages(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Query('before') before?: string,
    @Query('limit') limit?: string,
  ): Promise<MessageRow[]> {
    const dto = ListMessagesSchema.parse({
      conversationId: id,
      before,
      limit,
    });
    return this.convs.listMessages(userId, dto);
  }

  @Post(':id/messages')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @HttpCode(HttpStatus.CREATED)
  sendMessage(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: unknown,
  ): Promise<MessageRow> {
    const dto = SendMessageSchema.parse({
      ...(typeof body === 'object' && body !== null ? body : {}),
      conversationId: id,
    });
    return this.convs.sendMessage(userId, dto);
  }

  @Patch(':id/read')
  markAsRead(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ): Promise<{ success: true }> {
    return this.convs.markAsRead(userId, id);
  }

  /* Pre-purchase chat — opens a conversation with the seller of a listing
     without requiring an order. Rate-limited server-side at the service
     layer (per-pair + fresh-account caps). Throttler also caps raw
     endpoint hits to prevent brute-force enumeration. */
  @Post('pre-purchase')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.CREATED)
  openPrePurchase(
    @CurrentUser('id') userId: string,
    @Body() body: unknown,
  ): Promise<ConversationDetail> {
    const listingId =
      typeof body === 'object' && body !== null && 'listingId' in body
        ? String(body.listingId)
        : null;
    if (!listingId) {
      throw new BadRequestException('listingId required');
    }
    return this.convs.openPrePurchaseChat(userId, listingId);
  }

  /* Seller flags a pre-purchase chat as spam — blocks the buyer from
     re-opening for the same listing. */
  @Post(':id/spam')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  markSpam(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ): Promise<{ success: true }> {
    return this.convs.markConversationSpam(userId, id);
  }
}
