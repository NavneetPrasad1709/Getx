import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * RES-HIGH-017/018: Optional JWT guard for routes that are publicly
 * accessible but benefit from knowing who the caller is when a valid
 * token is present.
 *
 * Behaviour:
 *  - Token present + valid  → req.user is populated, guard returns true.
 *  - Token absent or invalid → req.user stays undefined, guard returns true.
 *
 * The route handler must treat req.user / @CurrentUser() as nullable.
 *
 * Usage: pair with @Public() so the global JwtAuthGuard short-circuits,
 * then add @UseGuards(OptionalJwtAuthGuard) at route level to attempt
 * optional authentication.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // Override canActivate to swallow passport errors silently.
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const result = await (super.canActivate(context) as Promise<boolean>);
      return result;
    } catch {
      // No token / invalid token — continue as anonymous.
      return true;
    }
  }

  // Override handleRequest so Passport doesn't throw on missing user.
  handleRequest<T = unknown>(err: unknown, user: T): T {
    return user ?? (null as unknown as T);
  }
}
