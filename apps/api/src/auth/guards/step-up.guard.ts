import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { STEP_UP_KEY } from '../decorators/require-step-up.decorator';

export const STEP_UP_AUDIENCE = 'getx-stepup';

/* Global guard — no-op unless the route carries @RequireStepUp(). When present
   it requires an `X-Step-Up-Token` header: a short-lived JWT (aud getx-stepup)
   bound to the caller's user id, minted by POST /auth/step-up after a fresh
   password/TOTP check. A distinct `step_up_required` error code lets the admin
   UI pop the re-auth modal and retry. */
@Injectable()
export class StepUpGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<boolean>(STEP_UP_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const req = context.switchToHttp().getRequest<
      Request & { user?: { id: string } }
    >();
    const user = req.user;
    if (!user?.id) throw new UnauthorizedException();

    const header = req.headers['x-step-up-token'];
    const token = Array.isArray(header) ? header[0] : header;
    if (!token) throw this.challenge();

    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        algorithms: ['HS256'],
        issuer: 'getx.live',
        audience: STEP_UP_AUDIENCE,
      });
      if (payload.sub !== user.id) throw new Error('subject mismatch');
      return true;
    } catch {
      throw this.challenge();
    }
  }

  private challenge(): ForbiddenException {
    return new ForbiddenException({
      statusCode: 403,
      code: 'step_up_required',
      message: 'Re-authentication required to perform this action.',
    });
  }
}
