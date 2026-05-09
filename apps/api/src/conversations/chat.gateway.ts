import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { parse as parseCookie } from 'cookie';
import { Server, Socket } from 'socket.io';
import { ConversationsService, type MessageRow } from './conversations.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

interface JoinPayload {
  conversationId: string;
}

interface SendPayload {
  conversationId: string;
  content: string;
  attachments?: string[];
}

interface TypingPayload {
  conversationId: string;
  isTyping: boolean;
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: (
      origin: string | undefined,
      cb: (err: Error | null, allow: boolean) => void,
    ) => cb(null, true),
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private userSockets = new Map<string, Set<string>>();

  constructor(
    private jwt: JwtService,
    private config: ConfigService,
    private convs: ConversationsService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const cookieHeader = client.handshake.headers.cookie ?? '';
      const cookies = parseCookie(cookieHeader);
      const token = cookies['accessToken'];
      if (!token) {
        client.disconnect();
        return;
      }

      const secret = this.config.get<string>('JWT_ACCESS_SECRET');
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token, {
        secret,
      });

      client.userId = payload.sub;

      const sockets = this.userSockets.get(payload.sub) ?? new Set<string>();
      sockets.add(client.id);
      this.userSockets.set(payload.sub, sockets);

      this.logger.log(`Socket connected: user=${payload.sub} sid=${client.id}`);
    } catch {
      this.logger.warn(`Auth failed for socket ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (!client.userId) return;
    const sockets = this.userSockets.get(client.userId);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.userSockets.delete(client.userId);
      }
    }
    this.logger.log(`Socket disconnected: user=${client.userId}`);
  }

  @SubscribeMessage('join_conversation')
  async handleJoin(
    @MessageBody() data: JoinPayload,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) return { error: 'Not authenticated' };
    const allowed = await this.convs.isParticipant(
      client.userId,
      data.conversationId,
    );
    if (!allowed) return { error: 'Not authorized' };

    await client.join(`conv:${data.conversationId}`);
    return { success: true };
  }

  @SubscribeMessage('leave_conversation')
  async handleLeave(
    @MessageBody() data: JoinPayload,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    await client.leave(`conv:${data.conversationId}`);
    return { success: true };
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @MessageBody() data: SendPayload,
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<{ success: true; message: MessageRow } | { error: string }> {
    if (!client.userId) return { error: 'Not authenticated' };

    try {
      const message = await this.convs.sendMessage(client.userId, {
        conversationId: data.conversationId,
        content: data.content,
        attachments: data.attachments ?? [],
        type: 'TEXT',
      });

      this.server
        .to(`conv:${data.conversationId}`)
        .emit('message_received', message);

      return { success: true, message };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Send failed';
      this.logger.warn(`send_message failed for ${client.userId}: ${msg}`);
      return { error: msg };
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: TypingPayload,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) return;
    client.to(`conv:${data.conversationId}`).emit('user_typing', {
      userId: client.userId,
      isTyping: data.isTyping,
    });
  }

  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @MessageBody() data: JoinPayload,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) return;
    try {
      await this.convs.markAsRead(client.userId, data.conversationId);
      this.server.to(`conv:${data.conversationId}`).emit('messages_read', {
        userId: client.userId,
        conversationId: data.conversationId,
      });
    } catch {
      // Silent — read receipts are best-effort.
    }
  }

  /**
   * Broadcast a server-emitted event (e.g. system message from OrdersService).
   */
  broadcastToConversation(
    conversationId: string,
    event: string,
    data: unknown,
  ) {
    this.server.to(`conv:${conversationId}`).emit(event, data);
  }

  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }
}
