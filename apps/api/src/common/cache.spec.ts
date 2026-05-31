import { cacheGet, cacheSet, cacheDel, cached, __clearLru } from './cache';

// No REDIS_URL in the test env → these exercise the bounded in-process LRU path.
describe('cache (LRU fallback)', () => {
  beforeEach(() => __clearLru());

  it('round-trips a value', async () => {
    await cacheSet('k', { a: 1 }, 60);
    expect(await cacheGet('k')).toEqual({ a: 1 });
  });

  it('returns null for a missing key', async () => {
    expect(await cacheGet('missing')).toBeNull();
  });

  it('cached() computes once, then serves from cache', async () => {
    const compute = jest.fn().mockResolvedValue(42);
    expect(await cached('c', 60, compute)).toBe(42);
    expect(await cached('c', 60, compute)).toBe(42);
    expect(compute).toHaveBeenCalledTimes(1);
  });

  it('does NOT cache a thrown computation', async () => {
    const boom = jest.fn().mockRejectedValue(new Error('nope'));
    await expect(cached('e', 60, boom)).rejects.toThrow('nope');
    // a subsequent successful compute is used (the throw wasn't stored)
    expect(await cached('e', 60, async () => 7)).toBe(7);
  });

  it('cacheDel evicts', async () => {
    await cacheSet('d', 'x', 60);
    await cacheDel('d');
    expect(await cacheGet('d')).toBeNull();
  });

  it('expires after the TTL', async () => {
    jest.useFakeTimers();
    try {
      await cacheSet('t', 'v', 1);
      expect(await cacheGet('t')).toBe('v');
      jest.advanceTimersByTime(1100);
      expect(await cacheGet('t')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });
});
