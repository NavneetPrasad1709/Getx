import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import type { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { AuditService } from '../audit/audit.service';

const JoinSchema = z.object({
  email: z.string().email().toLowerCase().trim().max(255),
  country: z
    .string()
    .length(2)
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, 'Use 2-letter ISO country code'),
});

/* Per-game waitlist — homepage roadmap cards only collect email +
   game slug. Country is inferred server-side from CF-IPCountry (or
   falls back to "XX" when unknown). Separate from the soft-launch
   /waitlist/join endpoint so per-game and country waitlists can be
   drained independently. */
const GameJoinSchema = z.object({
  email: z.string().email().toLowerCase().trim().max(255),
  game: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/, 'Use a kebab-case game slug'),
});

/* Tiny capture endpoint for the soft-launch waitlist. We don't have a
   dedicated WaitlistEntry model yet — every entry lands in the audit
   log so ops can drain them into the CRM/email tool of choice. Heavy
   rate-limit guards against scrape/abuse. */
@Controller('waitlist')
export class WaitlistController {
  private readonly logger = new Logger(WaitlistController.name);

  constructor(private audit: AuditService) {}

  @Public()
  @Post('join')
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  @HttpCode(HttpStatus.OK)
  async join(
    @Body() body: unknown,
    @Req() req: Request,
  ): Promise<{ success: true }> {
    const dto = JoinSchema.parse(body);
    await this.audit.log({
      action: 'waitlist.joined',
      entity: 'Waitlist',
      entityId: dto.email,
      metadata: { email: dto.email, country: dto.country },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      severity: 'INFO',
    });
    this.logger.log(`Waitlist join: ${dto.country} · ${dto.email}`);
    return { success: true as const };
  }

  @Public()
  @Post('game')
  @Throttle({ default: { limit: 10, ttl: 3_600_000 } })
  @HttpCode(HttpStatus.OK)
  async joinGame(
    @Body() body: unknown,
    @Req() req: Request,
  ): Promise<{ success: true }> {
    const dto = GameJoinSchema.parse(body);
    /* CF-IPCountry is the Cloudflare-provided two-letter country code.
       We don't fail the signup if absent — game waitlists are pre-launch
       interest signals and country accuracy is a "nice to have". */
    const cfCountry =
      (req.headers['cf-ipcountry'] as string | undefined)?.toUpperCase() ??
      'XX';

    await this.audit.log({
      action: 'waitlist.game_joined',
      entity: 'Waitlist',
      entityId: `${dto.game}:${dto.email}`,
      metadata: { email: dto.email, game: dto.game, country: cfCountry },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      severity: 'INFO',
    });
    this.logger.log(`Game waitlist: ${dto.game} · ${cfCountry} · ${dto.email}`);
    return { success: true as const };
  }
}
