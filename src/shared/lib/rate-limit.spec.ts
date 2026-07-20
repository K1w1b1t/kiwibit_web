import { isRateLimited, resetRateLimit } from './rate-limit';

describe('isRateLimited', () => {
  beforeEach(() => {
    resetRateLimit();
  });

  it('allows requests up to the limit', () => {
    const now = 1_000_000;
    expect(isRateLimited('ip', 3, 1000, now)).toBe(false);
    expect(isRateLimited('ip', 3, 1000, now + 10)).toBe(false);
    expect(isRateLimited('ip', 3, 1000, now + 20)).toBe(false);
    expect(isRateLimited('ip', 3, 1000, now + 30)).toBe(true);
  });

  it('resets after the window passes', () => {
    const now = 2_000_000;
    expect(isRateLimited('ip', 1, 1000, now)).toBe(false);
    expect(isRateLimited('ip', 1, 1000, now + 100)).toBe(true);
    expect(isRateLimited('ip', 1, 1000, now + 2000)).toBe(false);
  });

  it('tracks distinct keys independently', () => {
    const now = 3_000_000;
    expect(isRateLimited('a', 1, 1000, now)).toBe(false);
    expect(isRateLimited('b', 1, 1000, now)).toBe(false);
    expect(isRateLimited('a', 1, 1000, now + 1)).toBe(true);
  });
});
