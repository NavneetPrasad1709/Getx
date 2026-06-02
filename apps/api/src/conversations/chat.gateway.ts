import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
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
import { createAdapter } from '@socket.io/redis-adapter';
import { getRedisClient } from '../common/redis.factory';
import { ConversationsService, type MessageRow } from './conversations.service';
import { SendMessageSchema } from './dto/send-message.dto';
import {
  SocketRateLimiter,
  type SocketRateLimitEvent,
} from './socket-rate-limiter';
import { parseOriginList } from '../common/config-helpers';
import { PrismaService } from '../prisma/prisma.service';

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
      // APPSEC-003: browser clients always send Origin. A no-Origin handshake
      // is curl / server-to-server / native — allowed only outside production
      // so local tooling still works, but rejected in prod where it would be
      // an unchecked bypass of the allowlist.
      if (!origin) return cb(null, process.env.NODE_ENV !== 'production');
      if (WS_ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error(`Origin not allowed: ${origin}`));
    },
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);
  // In-memory map tracks sockets on THIS replica only. With the Redis adapter
  // installed, broadcastToConversation / broadcastToUser use server.to() which
  // the adapter fans out to all replicas automatically, so cross-pod delivery
  // works even though this Map is local.
  private userSockets = new Map<string, Set<string>>();

  constructor(
    private jwt: JwtService,
    private config: ConfigService,
    private convs: ConversationsService,
    private rateLimiter: SocketRateLimiter,
    private prisma: PrismaService,
  ) {}

  onModuleInit() {
    const redis = getRedisClient();
    if (!redis) {
      this.logger.warn(
        'REDIS_URL not set — Socket.io running in single-replica mode. ' +
        'Chat events will NOT reach clients on other API instances. ' +
        'Set REDIS_URL to enable the Redis adapter for horizontal scaling.',
      );
      return;
    }

    /* Each adapter needs its own client (pub + sub cannot share one connection).
       CRITICAL: both clients MUST have an 'error' listener. The pub client gets
       one from redis.factory, but the DUPLICATED sub client does not — and an
       ioredis client with no 'error' listener throws an UNHANDLED 'error' event
       (crashing the whole process) the moment Redis is unreachable. On a deploy
       where REDIS_URL points at a down/misconfigured Redis, that took the API
       down at boot → healthcheck failure. Handle it and never let a Redis
       problem crash the API — degrade to single-replica instead. */
    try {
      const pubClient = redis;
      const subClient = redis.duplicate();
      subClient.on('error', (err: Error) =>
        this.logger.error(`Socket.io Redis sub-client error: ${err.message}`),
      );
      this.server.adapter(createAdapter(pubClient, subClient));
      this.logger.log('Socket.io Redis adapter enabled — cross-replica chat active');
    } catch (err) {
      this.logger.error(
        `Failed to enable Redis socket adapter — continuing single-replica: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Try cookie first (works on Chrome/Firefox where same-site cookies
      // flow on WS upgrades).  Fall back to the `token` query-param which
      // the client sends when cookies are blocked (Safari ITP / iOS).
      const cookieHeader = client.handshake.headers.cookie ?? '';
      const cookies = parseCookie(cookieHeader);
      const token =
        cookies['accessToken'] ||
        (client.handshake.auth?.token as string | undefined) ||
        (client.handshake.query?.token as string | undefined);
      if (!token) {
        client.disconnect();
        return;
      }

      // Accept either the short-lived WS ticket (aud: getx-ws, AUTH-011) or a
      // raw access-token cookie (aud: getx-api) for the Chrome/Firefox path
      // where same-site cookies still flow on the upgrade. Enforcing issuer +
      // algorithm here closes the door on tokens minted for any other purpose.
      const secret = this.config.get<string>('JWT_ACCESS_SECRET');
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token, {
        secret,
        algorithms: ['HS256'],
        issuer: 'getx.live',
        audience: ['getx-api', 'getx-ws'],
      });

      // RES-HIGH-008: reject banned/suspended users immediately — without this
      // they keep 15-min chat capability after a ban
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { status: true },
      });
      if (!user || user.status !== 'ACTIVE') {
        client.disconnect();
        return;
      }

      client.userId = payload.sub;

      const sockets = this.userSockets.get(payload.sub) ?? new Set<string>();
      const wasOnline = sockets.size > 0;
      sockets.add(client.id);
      this.userSockets.set(payload.sub, sockets);

      await client.join(`user:${payload.sub}`);

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

  // RES-CRIT-007: emit only to the opt-in subscription room — the old
  // this.server.emit() sent every user's presence to every connected socket
  // (O(n²) fanout + privacy leak of online/offline timestamps)
  private emitPresence(userId: string, isOnline: boolean): void {
    this.server.to(`presence-watch:${userId}`).emit(`presence:user:${userId}`, {
      userId,
      isOnline,
      at: new Date().toISOString(),
    });
  }

  // Client calls watch_presence to opt into a specific user's presence events
  @SubscribeMessage('watch_presence')
  async handleWatchPresence(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId || !data?.userId) return;
    await client.join(`presence-watch:${data.userId}`);
    return { success: true };
  }

  @SubscribeMessage('unwatch_presence')
  async handleUnwatchPresence(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId || !data?.userId) return;
    await client.leave(`presence-watch:${data.userId}`);
    return { success: true };
  }

  /**
   * Forcefully disconnect all sockets for a user (called on ban).
   * RES-CRIT-024 / RES-HIGH-008
   */
  disconnectUser(userId: string): void {
    const sockets = this.userSockets.get(userId);
    if (!sockets) return;
    for (const socketId of sockets) {
      const socket = this.server.sockets.sockets.get(socketId);
      if (socket) socket.disconnect(true);
    }
    this.userSockets.delete(userId);
  }

  /**
   * Centralised rate-limit gate. Emits a `rate_limit_exceeded` event back to
   * the client (so the UI can debounce or warn) and returns false if blocked.
   */
  private async rateLimitOk(
    client: AuthenticatedSocket,
    event: SocketRateLimitEvent,
  ): Promise<boolean> {
    if (!client.userId) return false;
    const result = await this.rateLimiter.consume(client.userId, event);
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
    if (!(await this.rateLimitOk(client, 'join_conversation'))) {
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
    if (!(await this.rateLimitOk(client, 'leave_conversation'))) {
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
    if (!(await this.rateLimitOk(client, 'send_message'))) {
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
    if (!(await this.rateLimitOk(client, 'typing'))) return;

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
    if (!(await this.rateLimitOk(client, 'mark_read'))) return;

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
