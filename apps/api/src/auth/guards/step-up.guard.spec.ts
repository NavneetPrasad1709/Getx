import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { JwtService } from '@nestjs/jwt';
import type { ConfigService } from '@nestjs/config';
import { StepUpGuard } from './step-up.guard';

function ctx(
  user: unknown,
  headers: Record<string, string | undefined>,
): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ user, headers }) }),
  } as unknown as ExecutionContext;
}

function makeGuard(opts: {
  required: boolean;
  verify?: jest.Mock;
}) {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(opts.required),
  } as unknown as Reflector;
  const jwt = {
    verifyAsync: opts.verify ?? jest.fn(),
  } as unknown as JwtService;
  const config = { get: () => 'secret' } as unknown as ConfigService;
  return new StepUpGuard(reflector, jwt, config);
}

describe('StepUpGuard', () => {
  it('is a no-op on routes without @RequireStepUp', async () => {
    const guard = makeGuard({ required: false });
    await expect(guard.canActivate(ctx({ id: 'u1' }, {}))).resolves.toBe(true);
  });

  it('allows a valid step-up token bound to the caller', async () => {
    const verify = jest.fn().mockResolvedValue({ sub: 'u1' });
    const guard = makeGuard({ required: true, verify });
    await expect(
      guard.canActivate(ctx({ id: 'u1' }, { 'x-step-up-token': 'tok' })),
    ).resolves.toBe(true);
  });

  it('challenges (step_up_required) when the header is missing', async () => {
    const guard = makeGuard({ required: true });
    await expect(
      guard.canActivate(ctx({ id: 'u1' }, {})),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a token minted for a different user', async () => {
    const verify = jest.fn().mockResolvedValue({ sub: 'someone-else' });
    const guard = makeGuard({ required: true, verify });
    await expect(
      guard.canActivate(ctx({ id: 'u1' }, { 'x-step-up-token': 'tok' })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects an expired/invalid token', async () => {
    const verify = jest.fn().mockRejectedValue(new Error('expired'));
    const guard = makeGuard({ required: true, verify });
    await expect(
      guard.canActivate(ctx({ id: 'u1' }, { 'x-step-up-token': 'tok' })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects an unauthenticated caller', async () => {
    const guard = makeGuard({ required: true });
    await expect(
      guard.canActivate(ctx(undefined, { 'x-step-up-token': 'tok' })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
