import { createParamDecorator, ExecutionContext } from '@nestjs/common';

interface RequestWithUser {
  user?: Record<string, unknown> | null;
}

/**
 * RES-HIGH-017/018: Nullable variant of @CurrentUser for routes guarded
 * by OptionalJwtAuthGuard. Returns null (not undefined) when the request
 * is unauthenticated so callers can safely distinguish "no auth" from
 * "field missing on user".
 */
export const OptionalCurrentUser = createParamDecorator(
  (field: string | undefined, ctx: ExecutionContext): unknown => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user ?? null;
    if (!user) return null;
    return field ? (user[field] ?? null) : user;
  },
);
