import {
  getCachedAuthUser,
  setCachedAuthUser,
  invalidateAuthUser,
  type AuthUserRow,
} from './auth-user-cache';
import { __clearLru } from './cache';

const baseRow: AuthUserRow = {
  id: 'u1',
  email: 'a@b.com',
  role: 'BOTH',
  status: 'ACTIVE',
  emailVerified: new Date('2026-01-01T00:00:00.000Z'),
  kycLevel: 'LEVEL_0',
  kycStatus: 'NONE',
  country: 'US',
  name: 'A',
  avatar: null,
  passwordChangedAt: new Date('2026-02-01T00:00:00.000Z'),
};

describe('auth-user-cache', () => {
  beforeEach(() => __clearLru());

  it('rehydrates Date fields to real Date objects across the JSON round-trip', async () => {
    await setCachedAuthUser('u1', baseRow);
    const got = await getCachedAuthUser('u1');

    expect(got).not.toBeNull();
    expect(got!.id).toBe('u1');
    // The passwordChangedAt check in JwtStrategy calls .getTime() — must be a Date.
    expect(got!.passwordChangedAt).toBeInstanceOf(Date);
    expect(got!.passwordChangedAt!.getTime()).toBe(
      baseRow.passwordChangedAt!.getTime(),
    );
    expect(got!.emailVerified).toBeInstanceOf(Date);
    expect(got!.emailVerified!.getTime()).toBe(baseRow.emailVerified!.getTime());
  });

  it('preserves null Date fields', async () => {
    await setCachedAuthUser('u2', {
      ...baseRow,
      id: 'u2',
      emailVerified: null,
      passwordChangedAt: null,
    });
    const got = await getCachedAuthUser('u2');
    expect(got!.emailVerified).toBeNull();
    expect(got!.passwordChangedAt).toBeNull();
  });

  it('invalidate evicts the row (ban / password-reset take effect next request)', async () => {
    await setCachedAuthUser('u1', baseRow);
    await invalidateAuthUser('u1');
    expect(await getCachedAuthUser('u1')).toBeNull();
  });
});
