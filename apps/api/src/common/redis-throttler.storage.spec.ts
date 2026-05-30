import type { Redis } from 'ioredis';
import { RedisThrottlerStorage } from './redis-throttler.storage';

function fakeRedis(evalImpl: () => Promise<unknown>): Redis {
  return { eval: jest.fn(evalImpl) } as unknown as Redis;
}

describe('RedisThrottlerStorage', () => {
  it('returns timeToExpire in SECONDS even though ttl is milliseconds', async () => {
    const storage = new RedisThrottlerStorage(fakeRedis(async () => [1, 45_000]));
    const r = await storage.increment('1.2.3.4', 60_000, 60, 0, 'default');
    expect(r.totalHits).toBe(1);
    expect(r.timeToExpire).toBe(45); // 45_000ms -> 45s, NOT 45_000
    expect(r.isBlocked).toBe(false);
    expect(r.timeToBlockExpire).toBe(0);
  });

  it('blocks once hits exceed the limit and reports the block window in seconds', async () => {
    const storage = new RedisThrottlerStorage(fakeRedis(async () => [61, 30_000]));
    const r = await storage.increment('1.2.3.4', 60_000, 60, 0, 'default');
    expect(r.isBlocked).toBe(true);
    expect(r.timeToBlockExpire).toBe(30);
  });

  it('fails OPEN on a Redis error (no false-429 storm during an outage)', async () => {
    const storage = new RedisThrottlerStorage(
      fakeRedis(async () => {
        throw new Error('redis down');
      }),
    );
    const r = await storage.increment('1.2.3.4', 60_000, 60, 0, 'default');
    expect(r.isBlocked).toBe(false);
    expect(r.totalHits).toBe(1);
    expect(r.timeToExpire).toBe(60);
  });
});
