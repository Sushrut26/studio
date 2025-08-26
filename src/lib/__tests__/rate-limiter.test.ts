/**
 * @jest-environment node
 */

import rateLimit, { RateLimitStore } from '@/lib/rate-limiter';

class MemoryStore implements RateLimitStore {
  private store = new Map<string, { count: number; expiresAt: number }>();

  async increment(token: string, interval: number): Promise<number> {
    const now = Date.now();
    const entry = this.store.get(token);
    if (!entry || entry.expiresAt < now) {
      const newEntry = { count: 1, expiresAt: now + interval };
      this.store.set(token, newEntry);
      return 1;
    }
    entry.count += 1;
    return entry.count;
  }
}

describe('rate limiter', () => {
  it('blocks requests across instances', async () => {
    const store = new MemoryStore();
    const limiterA = rateLimit({ interval: 1000, store });
    const limiterB = rateLimit({ interval: 1000, store });

    const token = 'test-token';

    await limiterA.check(3, token);
    await limiterB.check(3, token);
    await limiterA.check(3, token);
    await expect(limiterB.check(3, token)).rejects.toThrow('Rate limit exceeded');
  });
});
