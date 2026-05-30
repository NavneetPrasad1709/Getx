import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import {
  OWNERSHIP_KEY,
  type OwnershipMeta,
  type OwnershipResource,
} from '../decorators/require-ownership.decorator';

/* Resolver registry — maps a resource to the set of user ids that "own" it.
   Owner fields are taken straight from the Prisma schema (verified): a row with
   both a buyer and seller is owned by both (either participant may act on it).
   Returns null when the row does not exist. */
type Resolver = (
  prisma: PrismaService,
  id: string,
) => Promise<string[] | null>;

const RESOLVERS: Record<OwnershipResource, Resolver> = {
  order: async (p, id) => {
    const r = await p.order.findUnique({
      where: { id },
      select: { buyerId: true, sellerId: true },
    });
    return r ? [r.buyerId, r.sellerId] : null;
  },
  listing: async (p, id) => {
    const r = await p.productListing.findUnique({
      where: { id },
      select: { sellerId: true },
    });
    return r ? [r.sellerId] : null;
  },
  conversation: async (p, id) => {
    const r = await p.conversation.findUnique({
      where: { id },
      select: { buyerId: true, sellerId: true },
    });
    return r ? [r.buyerId, r.sellerId] : null;
  },
  address: async (p, id) => {
    const r = await p.address.findUnique({
      where: { id },
      select: { userId: true },
    });
    return r ? [r.userId] : null;
  },
  withdrawal: async (p, id) => {
    const r = await p.withdrawal.findUnique({
      where: { id },
      select: { userId: true },
    });
    return r ? [r.userId] : null;
  },
  offer: async (p, id) => {
    const r = await p.offer.findUnique({
      where: { id },
      select: { sellerId: true, buyerId: true },
    });
    return r ? [r.sellerId, r.buyerId] : null;
  },
  customRequest: async (p, id) => {
    const r = await p.customRequest.findUnique({
      where: { id },
      select: { buyerId: true },
    });
    return r ? [r.buyerId] : null;
  },
  savedSearch: async (p, id) => {
    const r = await p.savedSearch.findUnique({
      where: { id },
      select: { userId: true },
    });
    return r ? [r.userId] : null;
  },
  paymentMethod: async (p, id) => {
    const r = await p.paymentMethod.findUnique({
      where: { id },
      select: { userId: true },
    });
    return r ? [r.userId] : null;
  },
  review: async (p, id) => {
    const r = await p.review.findUnique({
      where: { id },
      select: { authorId: true },
    });
    return r ? [r.authorId] : null;
  },
};

const DEFAULT_ALLOW_ROLES = ['ADMIN', 'SUPER_ADMIN'];

/* Global guard — runs after JwtAuthGuard/RolesGuard so req.user is populated.
   It is a no-op on any route WITHOUT @RequireOwnership, so existing routes are
   completely unaffected; only annotated routes get the extra check. */
@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const meta = this.reflector.getAllAndOverride<OwnershipMeta | undefined>(
      OWNERSHIP_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!meta) return true; // route did not opt in

    const req = context.switchToHttp().getRequest<
      Request & { user?: { id: string; role: string } }
    >();
    const user = req.user;
    if (!user?.id) throw new UnauthorizedException();

    // Privileged roles (admin/ops) bypass per-resource ownership by design.
    const allowRoles = meta.allowRoles ?? DEFAULT_ALLOW_ROLES;
    if (allowRoles.includes(user.role)) return true;

    const id = (req.params as Record<string, string> | undefined)?.[
      meta.idParam ?? 'id'
    ];
    if (!id) throw new NotFoundException();

    const owners = await RESOLVERS[meta.resource](this.prisma, id);

    // IDOR-safe: a non-owner gets 404, never a 403 that confirms the row exists.
    if (!owners || !owners.includes(user.id)) {
      throw new NotFoundException();
    }
    return true;
  }
}
