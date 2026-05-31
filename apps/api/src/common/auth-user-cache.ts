import { cacheGet, cacheSet, cacheDel } from './cache';

/* PERF-002 — per-request auth user cache.

   JwtStrategy.validate ran a full user row read on EVERY authenticated request,
   pinning a DB connection per call. This caches the projected row for a short
   window (30s) so hot paths skip the DB on a hit. The window is short AND the
   security-sensitive transitions (ban, password reset, KYC) explicitly
   invalidate, so a stolen-after-ban / pre-reset token can't outlive the change
   by more than the TTL — and usually not at all. */

export const AUTH_USER_TTL_SEC = 30;

/** Exactly the projection JwtStrategy reads. */
export interface AuthUserRow {
  id: string;
  email: string;
  role: string;
  status: string;
  emailVerified: Date | null;
  kycLevel: string;
  kycStatus: string;
  country: string;
  name: string | null;
  avatar: string | null;
  passwordChangedAt: Date | null;
}

// JSON-safe wire shape (Dates → ISO strings).
interface SerializedAuthUser
  extends Omit<AuthUserRow, 'emailVerified' | 'passwordChangedAt'> {
  emailVerified: string | null;
  passwordChangedAt: string | null;
}

function key(sub: string): string {
  return `auth:user:${sub}`;
}

export async function getCachedAuthUser(
  sub: string,
): Promise<AuthUserRow | null> {
  const raw = await cacheGet<SerializedAuthUser>(key(sub));
  if (!raw) return null;
  return {
    ...raw,
    emailVerified: raw.emailVerified ? new Date(raw.emailVerified) : null,
    passwordChangedAt: raw.passwordChangedAt
      ? new Date(raw.passwordChangedAt)
      : null,
  };
}

export async function setCachedAuthUser(
  sub: string,
  row: AuthUserRow,
): Promise<void> {
  const serialized: SerializedAuthUser = {
    ...row,
    emailVerified: row.emailVerified ? row.emailVerified.toISOString() : null,
    passwordChangedAt: row.passwordChangedAt
      ? row.passwordChangedAt.toISOString()
      : null,
  };
  await cacheSet(key(sub), serialized, AUTH_USER_TTL_SEC);
}

/** Drop the cached row so the next request reloads from the DB. Call on any
 *  change to a field in the projection (status, passwordChangedAt, kyc, role). */
export async function invalidateAuthUser(sub: string): Promise<void> {
  await cacheDel(key(sub));
}
