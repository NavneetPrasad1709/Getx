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

// Defence-in-depth — even after HMAC verification we still validate the
// payload shape so an authenticated-but-malformed event can't crash the
// handler or smuggle unexpected fields into the account service.
const SumsubPayloadSchema = z.object({
  applicantId: z.string().min(1).max(200),
  externalUserId: z.string().max(200).optional(),
  type: z.string().min(1).max(100),
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
      if (
        !signature ||
        expected.length !== signature.length ||
        !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
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
