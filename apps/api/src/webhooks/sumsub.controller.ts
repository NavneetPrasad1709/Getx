import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import type { Request } from 'express';
import { z } from 'zod';
import { Public } from '../auth/decorators/public.decorator';
import { AccountService } from '../account/account.service';
import { PrismaService } from '../prisma/prisma.service';

// Defence-in-depth — even after HMAC verification we still validate the
// payload shape so an authenticated-but-malformed event can't crash the
// handler or smuggle unexpected fields into the account service.
const SumsubPayloadSchema = z.object({
  applicantId: z.string().min(1).max(200),
  externalUserId: z.string().max(200).optional(),
  type: z.string().min(1).max(100),
  // createdAt from Sumsub — ISO string used as part of idempotency key
  createdAt: z.string().max(40).optional(),
  reviewResult: z
    .object({
      reviewAnswer: z.enum(['GREEN', 'RED', 'YELLOW']),
      rejectLabels: z.array(z.string().max(80)).max(40).optional(),
    })
    .optional(),
});
type SumsubPayload = z.infer<typeof SumsubPayloadSchema>;

/* Public webhook endpoint for Sumsub e-KYC. Sumsub posts applicantReviewed
   when a review finishes; we verify the HMAC signature against
   SUMSUB_SECRET_KEY before mutating user state. In dev (no secret), we
   accept the payload but log the missing signature so flows are testable. */
@Controller('webhooks/sumsub')
export class SumsubWebhookController {
  private readonly logger = new Logger(SumsubWebhookController.name);

  constructor(
    private config: ConfigService,
    private account: AccountService,
    private prisma: PrismaService,
  ) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  async handle(
    @Headers('x-payload-digest') signature: string | undefined,
    @Headers('x-payload-digest-alg') algo: string | undefined,
    @Body() rawPayload: unknown,
    @Req() req: Request,
  ): Promise<{ ok: true }> {
    const secret = this.config.get<string>('SUMSUB_SECRET_KEY');

    if (secret) {
      const rawBody =
        (req as Request & { rawBody?: Buffer }).rawBody?.toString() ??
        JSON.stringify(rawPayload);
      const algoUsed = (algo ?? 'HMAC_SHA256_HEX').toUpperCase();
      const expected = createHmac(
        algoUsed.includes('SHA512')
          ? 'sha512'
          : algoUsed.includes('SHA1')
            ? 'sha1'
            : 'sha256',
        secret,
      )
        .update(rawBody)
        .digest('hex');
      // PAY-MED-033: use hex encoding on both sides — without 'hex' flag,
      // Buffer.from() treats strings as UTF-8 which silently fails for
      // uppercase-hex signatures Sumsub may send
      const expectedBuf = Buffer.from(expected, 'hex');
      const sigBuf = Buffer.from(signature ?? '', 'hex');
      if (
        !signature ||
        expectedBuf.length === 0 ||
        sigBuf.length !== expectedBuf.length ||
        !timingSafeEqual(sigBuf, expectedBuf)
      ) {
        this.logger.warn('Sumsub webhook signature mismatch');
        throw new BadRequestException('Invalid signature');
      }
    } else {
      /* Production must verify every webhook — otherwise any anonymous
         attacker can POST { reviewResult: { reviewAnswer: 'GREEN' } }
         and have us flip kycStatus → VERIFIED on a targeted userId,
         unlocking withdrawals + bypassing sanctions checks. Dev allows
         the unsigned path so a local Sumsub-less environment can still
         smoke the flow. */
      if (process.env.NODE_ENV === 'production') {
        this.logger.error(
          'SUMSUB_SECRET_KEY missing in production — refusing unsigned webhook.',
        );
        throw new BadRequestException('Webhook verification unavailable');
      }
      this.logger.warn(
        'SUMSUB_SECRET_KEY missing — accepting webhook without signature verification (dev mode).',
      );
    }

    const body: SumsubPayload = SumsubPayloadSchema.parse(rawPayload);

    // PAY-HIGH-012: idempotency — keyed by applicantId:type:createdAt so a
    // replayed GREEN event doesn't re-flip kycStatus after a manual REJECT
    const idempotencyKey = `${body.applicantId}:${body.type}:${body.createdAt ?? 'unknown'}`;
    try {
      await this.prisma.webhookEvent.create({
        data: {
          provider: 'sumsub',
          externalId: idempotencyKey,
          type: body.type,
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
          `Sumsub webhook idempotent skip (already processed): ${idempotencyKey}`,
        );
        return { ok: true };
      }
      throw err;
    }

    try {
      await this.account.handleSumsubWebhook(body);
    } catch (err) {
      this.logger.error(
        `Sumsub webhook processing failed: ${(err as Error).message}`,
      );
      /* Return OK to prevent Sumsub retry storms; we logged the error. */
    }
    return { ok: true };
  }
}
