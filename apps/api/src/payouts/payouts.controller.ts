import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import type { Request } from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { StripeConnectService } from './stripe-connect.service';
import { PrismaService } from '../prisma/prisma.service';

interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

const StartConnectSchema = z.object({
  returnPath: z.string().startsWith('/').max(120).optional(),
  refreshPath: z.string().startsWith('/').max(120).optional(),
});

@Controller('payouts')
export class PayoutsController {
  private readonly logger = new Logger(PayoutsController.name);
  private readonly connectWebhookSecret: string;

  constructor(
    private connect: StripeConnectService,
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    /* Separate Connect webhook secret — Stripe lets you register a
       distinct webhook endpoint per account context. Falls back to
       the main STRIPE_WEBHOOK_SECRET in dev when only one is set. */
    this.connectWebhookSecret =
      config.get<string>('STRIPE_CONNECT_WEBHOOK_SECRET') ??
      config.get<string>('STRIPE_WEBHOOK_SECRET') ??
      '';
  }

  /* Seller-facing — returns a one-shot URL the seller hits to onboard
     to Stripe Connect Express. Rate-limited so a compromised session
     can't farm AccountLinks endlessly. */
  @Post('connect/start')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  start(
    @CurrentUser('id') userId: string,
    @Body() body: unknown,
  ): Promise<{ url: string; expiresAt: string }> {
    const dto = StartConnectSchema.parse(body ?? {});
    return this.connect.createOnboardingLink(
      userId,
      dto.returnPath ?? '/profile/payouts?onboarded=1',
      dto.refreshPath ?? '/profile/payouts?refresh=1',
    );
  }

  @Get('connect/status')
  status(
    @CurrentUser('id') userId: string,
  ): ReturnType<StripeConnectService['getStatus']> {
    return this.connect.getStatus(userId);
  }

  /* Stripe Connect webhook — receives `account.updated` events when
     capabilities flip on a seller's Express account. Separate from the
     main /payments/webhook so the two pipelines don't interfere when
     the dashboard secrets differ. Public + signature-verified. */
  @Public()
  @Post('connect/webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Headers() headers: Record<string, string>,
    @Req() req: RawBodyRequest,
  ): Promise<{ received: boolean }> {
    const body = req.rawBody?.toString() ?? JSON.stringify(req.body ?? {});
    if (this.connectWebhookSecret) {
      const sig = headers['stripe-signature'];
      if (!sig || !this.verify(sig, body)) {
        this.logger.warn('Connect webhook signature invalid — ignoring');
        return { received: false };
      }
    } else {
      this.logger.warn(
        'STRIPE_CONNECT_WEBHOOK_SECRET unset — skipping verification (dev only)',
      );
    }
    try {
      const event = JSON.parse(body) as {
        id?: string;
        type?: string;
        data?: { object?: Record<string, unknown> };
      };

      // PAY-HIGH-011: idempotency — record the event before processing so
      // replays are silently dropped without re-running handleAccountUpdated
      if (event.id) {
        try {
          await this.prisma.webhookEvent.create({
            data: {
              provider: 'stripe-connect',
              externalId: event.id,
              type: event.type ?? 'unknown',
            },
          });
        } catch (err) {
          if (
            err &&
            typeof err === 'object' &&
            'code' in err &&
            (err as { code?: string }).code === 'P2002'
          ) {
            this.logger.log(
              `Connect webhook idempotent skip (already processed): ${event.id}`,
            );
            return { received: true };
          }
          throw err;
        }
      }

      if (event.type === 'account.updated' && event.data?.object) {
        await this.connect.handleAccountUpdated(
          event.data.object as unknown as Parameters<
            StripeConnectService['handleAccountUpdated']
          >[0],
        );
      }
    } catch (err) {
      this.logger.error(
        `Connect webhook parse failed: ${err instanceof Error ? err.message : err}`,
      );
    }
    return { received: true };
  }

  /* Stripe-Signature verification — same scheme as the order webhook
     (t=<ts>,v1=<sig>...). Kept inline so the payouts module doesn't
     depend on the payments module. */
  private verify(signatureHeader: string, body: string): boolean {
    const parts = signatureHeader
      .split(',')
      .reduce<Record<string, string[]>>((acc, part) => {
        const [k, v] = part.split('=');
        if (!k || !v) return acc;
        if (!acc[k]) acc[k] = [];
        acc[k].push(v);
        return acc;
      }, {});
    const timestamp = parts.t?.[0];
    const sigs = parts.v1 ?? [];
    if (!timestamp || sigs.length === 0) return false;

    // PAY-CRIT-010: replay window check — captured Connect events could
    // otherwise be replayed indefinitely to flip payoutsEnabled=true
    const sentAtMs = parseInt(timestamp, 10) * 1000;
    if (
      !Number.isFinite(sentAtMs) ||
      Math.abs(Date.now() - sentAtMs) > 5 * 60 * 1000
    ) {
      this.logger.warn(
        `Connect webhook timestamp outside 5-min tolerance (t=${timestamp}) — rejecting`,
      );
      return false;
    }

    const expected = createHmac('sha256', this.connectWebhookSecret)
      .update(`${timestamp}.${body}`)
      .digest('hex');
    const expectedBuf = Buffer.from(expected, 'hex');
    for (const s of sigs) {
      try {
        const got = Buffer.from(s, 'hex');
        if (
          got.length === expectedBuf.length &&
          timingSafeEqual(got, expectedBuf)
        ) {
          return true;
        }
      } catch {
        /* malformed — skip */
      }
    }
    return false;
  }
}
