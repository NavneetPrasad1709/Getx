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
import { Public } from '../auth/decorators/public.decorator';
import { AccountService } from '../account/account.service';

interface SumsubPayload {
  applicantId: string;
  externalUserId?: string;
  type: string;
  reviewResult?: {
    reviewAnswer: 'GREEN' | 'RED' | 'YELLOW';
    rejectLabels?: string[];
  };
}

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
    @Body() body: SumsubPayload,
    @Req() req: Request,
  ): Promise<{ ok: true }> {
    const secret = this.config.get<string>('SUMSUB_SECRET_KEY');

    if (secret) {
      const rawBody =
        (req as Request & { rawBody?: Buffer }).rawBody?.toString() ??
        JSON.stringify(body);
      const algoUsed = (algo ?? 'HMAC_SHA256_HEX').toUpperCase();
      const expected = createHmac(
        algoUsed.includes('SHA512') ? 'sha512' : algoUsed.includes('SHA1') ? 'sha1' : 'sha256',
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
      this.logger.warn(
        'SUMSUB_SECRET_KEY missing — accepting webhook without signature verification (dev mode).',
      );
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
