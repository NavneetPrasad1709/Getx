import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { OwnershipGuard } from './ownership.guard';
import type { PrismaService } from '../../prisma/prisma.service';
import type { OwnershipMeta } from '../decorators/require-ownership.decorator';

function ctx(user: unknown, params: Record<string, string>): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ user, params }) }),
  } as unknown as ExecutionContext;
}

function makeGuard(meta: OwnershipMeta | undefined, order: unknown) {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(meta),
  } as unknown as Reflector;
  const prisma = {
    order: { findUnique: jest.fn().mockResolvedValue(order) },
  } as unknown as PrismaService;
  return new OwnershipGuard(reflector, prisma);
}

describe('OwnershipGuard', () => {
  const orderMeta: OwnershipMeta = { resource: 'order' };

  it('is a no-op on routes without @RequireOwnership', async () => {
    const guard = makeGuard(undefined, null);
    await expect(
      guard.canActivate(ctx({ id: 'anyone', role: 'BUYER' }, { id: 'o1' })),
    ).resolves.toBe(true);
  });

  it('allows the buyer (an owner) through', async () => {
    const guard = makeGuard(orderMeta, { buyerId: 'u1', sellerId: 'u2' });
    await expect(
      guard.canActivate(ctx({ id: 'u1', role: 'BUYER' }, { id: 'o1' })),
    ).resolves.toBe(true);
  });

  it('allows the seller (the other owner) through', async () => {
    const guard = makeGuard(orderMeta, { buyerId: 'u1', sellerId: 'u2' });
    await expect(
      guard.canActivate(ctx({ id: 'u2', role: 'BOTH' }, { id: 'o1' })),
    ).resolves.toBe(true);
  });

  it('404s a non-owner (IDOR-safe: never confirms the row exists)', async () => {
    const guard = makeGuard(orderMeta, { buyerId: 'u1', sellerId: 'u2' });
    await expect(
      guard.canActivate(ctx({ id: 'attacker', role: 'BUYER' }, { id: 'o1' })),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('404s when the resource does not exist', async () => {
    const guard = makeGuard(orderMeta, null);
    await expect(
      guard.canActivate(ctx({ id: 'u1', role: 'BUYER' }, { id: 'missing' })),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lets ADMIN bypass per-resource ownership', async () => {
    const guard = makeGuard(orderMeta, { buyerId: 'u1', sellerId: 'u2' });
    await expect(
      guard.canActivate(ctx({ id: 'admin1', role: 'ADMIN' }, { id: 'o1' })),
    ).resolves.toBe(true);
  });

  it('rejects an unauthenticated request on a protected route', async () => {
    const guard = makeGuard(orderMeta, { buyerId: 'u1', sellerId: 'u2' });
    await expect(
      guard.canActivate(ctx(undefined, { id: 'o1' })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
