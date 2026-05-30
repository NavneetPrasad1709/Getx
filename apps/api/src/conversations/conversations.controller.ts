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
import { z } from 'zod';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireOwnership } from '../auth/decorators/require-ownership.decorator';
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

  // RES-HIGH-006: throttle conversation starts to prevent P2002 storms
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post()
  startConversation(
    @CurrentUser('id') userId: string,
    @Body() body: unknown,
  ): Promise<ConversationDetail> {
    const dto = StartConversationSchema.parse(body);
    return this.convs.getOrCreateConversation(userId, dto);
  }

  @Get(':id')
  @RequireOwnership('conversation')
  getConversation(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ): Promise<ConversationDetail> {
    return this.convs.getConversation(userId, id);
  }

  @Get(':id/messages')
  @RequireOwnership('conversation')
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
  @RequireOwnership('conversation')
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
  @RequireOwnership('conversation')
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
    // RES-MED-037: use Zod instead of manual typeof check
    const { listingId } = z.object({ listingId: z.string().min(1).max(40) }).parse(body);
    return this.convs.openPrePurchaseChat(userId, listingId);
  }

  /* Seller flags a pre-purchase chat as spam — blocks the buyer from
     re-opening for the same listing. */
  @Post(':id/spam')
  @RequireOwnership('conversation')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  markSpam(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ): Promise<{ success: true }> {
    return this.convs.markConversationSpam(userId, id);
  }
}
