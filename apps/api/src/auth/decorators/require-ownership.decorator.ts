import { SetMetadata } from '@nestjs/common';

/* ARCH-009 — declarative resource-ownership.

   Object-level authorization (does THIS user own THIS row?) was historically
   enforced ad-hoc inside each service. That works until someone adds a route
   and forgets the check — a classic IDOR. @RequireOwnership moves the check to
   the route declaration where it can't be silently omitted; the OwnershipGuard
   resolves the row by the route's id param and confirms the caller owns it (or
   holds an allowed role). It is defense-in-depth: existing in-service checks
   stay as a second layer. */

export const OWNERSHIP_KEY = 'ownership';

// Resources the OwnershipGuard knows how to resolve. Keep in sync with the
// RESOLVERS registry in ownership.guard.ts.
export type OwnershipResource =
  | 'order'
  | 'listing'
  | 'conversation'
  | 'address'
  | 'withdrawal'
  | 'offer'
  | 'customRequest'
  | 'savedSearch'
  | 'paymentMethod'
  | 'review';

export interface OwnershipMeta {
  resource: OwnershipResource;
  /** Route param holding the resource id. Default: 'id'. */
  idParam?: string;
  /** Roles allowed to bypass the ownership check. Default: ADMIN, SUPER_ADMIN. */
  allowRoles?: string[];
}

export const RequireOwnership = (
  resource: OwnershipResource,
  opts: Omit<OwnershipMeta, 'resource'> = {},
) => SetMetadata(OWNERSHIP_KEY, { resource, ...opts } satisfies OwnershipMeta);
