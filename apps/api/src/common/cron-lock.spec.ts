jest.mock('./redis.factory', () => ({ getRedisClient: jest.fn() }));

import { getRedisClient } from './redis.factory';
import { withCronLock } from './cron-lock';

const mockGetRedis = getRedisClient as jest.Mock;

describe('withCronLock', () => {
  beforeEach(() => mockGetRedis.mockReset());

  it('runs the job directly when Redis is absent (single-replica/dev)', async () => {
    mockGetRedis.mockReturnValue(null);
    const fn = jest.fn().mockResolvedValue('done');
    await expect(withCronLock('job', 1000, fn)).resolves.toBe('done');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('runs the job when it wins the lock, then releases it', async () => {
    const redis = {
      set: jest.fn().mockResolvedValue('OK'),
      eval: jest.fn().mockResolvedValue(1),
    };
    mockGetRedis.mockReturnValue(redis);
    const fn = jest.fn().mockResolvedValue('ran');

    await expect(withCronLock('job', 1000, fn)).resolves.toBe('ran');
    expect(redis.set).toHaveBeenCalledWith(
      'cronlock:job',
      expect.any(String),
      'PX',
      1000,
      'NX',
    );
    expect(redis.eval).toHaveBeenCalled(); // compare-and-delete release
  });

  it('SKIPS the job when another replica already holds the lock', async () => {
    const redis = { set: jest.fn().mockResolvedValue(null), eval: jest.fn() };
    mockGetRedis.mockReturnValue(redis);
    const fn = jest.fn();

    await expect(withCronLock('job', 1000, fn)).resolves.toBeUndefined();
    expect(fn).not.toHaveBeenCalled();
    expect(redis.eval).not.toHaveBeenCalled(); // never acquired → never release
  });

  it('fails OPEN and runs the job if Redis errors on acquire', async () => {
    const redis = {
      set: jest.fn().mockRejectedValue(new Error('redis down')),
      eval: jest.fn(),
    };
    mockGetRedis.mockReturnValue(redis);
    const fn = jest.fn().mockResolvedValue('ran-anyway');

    await expect(withCronLock('job', 1000, fn)).resolves.toBe('ran-anyway');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
