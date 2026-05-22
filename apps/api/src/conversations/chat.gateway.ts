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
import { SendMessageSchema } from './dto/send-message.dto';
import {
  SocketRateLimiter,
  type SocketRateLimitEvent,
} from './socket-rate-limiter';
import { parseOriginList } from '../common/config-helpers';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

interface JoinPayload {
  conversationId: string;
}

interface TypingPayload {
  conversationId: string;
  isTyping: boolean;
}

// Decorator config is read at class-definition time, before DI runs, so the
// allowlist must be sourced from process.env (not ConfigService). The HTTP
// CORS in main.ts uses the same env vars, so the gateway stays aligned.
// Each env var may be a CSV of origins; parseOriginList flattens them so
// origin equality matches a single host, not the comma-joined blob.
const WS_ALLOWED_ORIGINS = [
  ...parseOriginList(process.env.WEB_URL, 'http://localhost:3000'),
  ...parseOriginList(process.env.SELLER_URL, 'http://localhost:3001'),
  ...parseOriginList(process.env.ADMIN_URL, 'http://localhost:3002'),
];

@Injectable()
@WebSocketGateway({
  cors: {
    origin: (
      origin: string | undefined,
      cb: (err: Error | null, allowed?: boolean) => void,
    ) => {
      // No-origin requests (curl, server-to-server, mobile webviews) bypass
      // the CORS check — browser clients always send Origin.
      if (!origin) return cb(null, true);
      if (WS_ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error(`Origin not allowed: ${origin}`));
    },
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
    private rateLimiter: SocketRateLimiter,
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
      const wasOnline = sockets.size > 0;
      sockets.add(client.id);
      this.userSockets.set(payload.sub, sockets);

      /* Auto-join a per-user room so the server can push lifecycle
         events (`order:paid`, `order:delivered`, `dispute:opened`, …)
         to every device the user has open without addressing each
         socket id individually. The room name is the user id so any
         service can broadcast via `broadcastToUser(userId, event, data)`. */
      await client.join(`user:${payload.sub}`);

      /* Broadcast `online` only on the first socket per user — additional
         tabs from the same user don't re-fire the event. */
      if (!wasOnline) {
        this.emitPresence(payload.sub, true);
      }

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
        /* Last socket gone — broadcast offline. Subscribers on the buyer
           side flip the green dot back to gray. */
        this.emitPresence(client.userId, false);
      }
    }
    this.logger.log(`Socket disconnected: user=${client.userId}`);
  }

  /* Presence broadcast — emits `presence:user:${id}` so anyone subscribed
     to that specific user gets a flip event without flooding the whole
     namespace with every user's transitions. Frontend hooks subscribe
     using socket.on(`presence:user:${id}`). */
  private emitPresence(userId: string, isOnline: boolean): void {
    const event = `presence:user:${userId}`;
    this.server.emit(event, {
      userId,
      isOnline,
      at: new Date().toISOString(),
    });
  }

  /**
   * Centralised rate-limit gate. Emits a `rate_limit_exceeded` event back to
   * the client (so the UI can debounce or warn) and returns false if blocked.
   */
  private rateLimitOk(
    client: AuthenticatedSocket,
    event: SocketRateLimitEvent,
  ): boolean {
    if (!client.userId) return false;
    const result = this.rateLimiter.consume(client.userId, event);
    if (!result.allowed) {
      client.emit('rate_limit_exceeded', {
        event,
        retryAfterMs: result.retryAfterMs,
      });
      return false;
    }
    return true;
  }

  @SubscribeMessage('join_conversation')
  async handleJoin(
    @MessageBody() data: JoinPayload,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) return { error: 'Not authenticated' };
    if (!data?.conversationId) return { error: 'conversationId required' };
    if (!this.rateLimitOk(client, 'join_conversation')) {
      return { error: 'Rate limit exceeded' };
    }

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
    if (!client.userId) return { error: 'Not authenticated' };
    if (!data?.conversationId) return { error: 'conversationId required' };
    if (!this.rateLimitOk(client, 'leave_conversation')) {
      return { error: 'Rate limit exceeded' };
    }
    await client.leave(`conv:${data.conversationId}`);
    return { success: true };
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @MessageBody() data: unknown,
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<
    | { success: true; message: MessageRow }
    | {
        error: string;
        issues?: Array<{ path: PropertyKey[]; message: string }>;
      }
  > {
    if (!client.userId) return { error: 'Not authenticated' };
    if (!this.rateLimitOk(client, 'send_message')) {
      return { error: 'Rate limit exceeded. Slow down.' };
    }

    const raw =
      typeof data === 'object' && data !== null
        ? (data as Record<string, unknown>)
        : {};
    // Force type to TEXT — SYSTEM messages come from the server only.
    const parsed = SendMessageSchema.safeParse({
      conversationId: raw.conversationId,
      content: raw.content,
      attachments: raw.attachments ?? [],
      type: 'TEXT',
    });

    if (!parsed.success) {
      return {
        error: 'Invalid message',
        issues: parsed.error.issues.map((i) => ({
          path: i.path,
          message: i.message,
        })),
      };
    }

    try {
      const message = await this.convs.sendMessage(client.userId, parsed.data);
      this.server
        .to(`conv:${parsed.data.conversationId}`)
        .emit('message_received', message);
      return { success: true, message };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Send failed';
      this.logger.warn(`send_message failed for ${client.userId}: ${msg}`);
      return { error: msg };
    }
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @MessageBody() data: TypingPayload,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) return;
    if (!data?.conversationId || typeof data.isTyping !== 'boolean') return;
    if (!this.rateLimitOk(client, 'typing')) return;

    // Participant gate prevents typing-event spoofing into others' rooms.
    const allowed = await this.convs.isParticipant(
      client.userId,
      data.conversationId,
    );
    if (!allowed) return;

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
    if (!data?.conversationId) return;
    if (!this.rateLimitOk(client, 'mark_read')) return;

    try {
      // markAsRead runs its own participant check; if it throws we never
      // reach the broadcast, so 3rd-party callers can't fake read receipts.
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
   * Server-side broadcast helper. Used by OrdersService / PaymentsService to
   * push ORDER_PAID / DELIVERED / COMPLETED system messages.
   */
  broadcastToConversation(
    conversationId: string,
    event: string,
    data: unknown,
  ) {
    this.server.to(`conv:${conversationId}`).emit(event, data);
  }

  /**
   * Push an event to every device the user currently has open. Backed
   * by the `user:${userId}` room every authenticated socket auto-joins.
   * Used for lifecycle pushes (`order:paid`, `order:confirmed`,
   * `dispute:opened`, …) so the seller/buyer UI can invalidate stale
   * lists without polling.
   */
  broadcastToUser(userId: string, event: string, data: unknown) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }
}
