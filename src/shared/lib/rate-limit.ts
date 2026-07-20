/**
 * Minimal in-memory sliding-window rate limiter.
 *
 * Limitation: state lives in module scope, so it is per-instance and resets on
 * deploy. On serverless/multi-instance deployments each instance keeps its own
 * window — this is an abuse damper, not a hard guarantee. For the low-volume
 * contact form it is paired with a honeypot (the primary spam gate).
 */

const buckets = new Map<string, number[]>();

export function isRateLimited(
  key: string,
  max: number,
  windowMs: number,
  now = Date.now(),
): boolean {
  const threshold = now - windowMs;
  const timestamps = (buckets.get(key) ?? []).filter((ts) => ts > threshold);

  if (timestamps.length >= max) {
    buckets.set(key, timestamps);
    return true;
  }

  timestamps.push(now);
  buckets.set(key, timestamps);

  // Opportunistic pruning to bound memory when many distinct keys accumulate.
  if (buckets.size > 5000) {
    for (const [bucketKey, values] of buckets) {
      const alive = values.filter((ts) => ts > threshold);
      if (alive.length === 0) {
        buckets.delete(bucketKey);
      } else {
        buckets.set(bucketKey, alive);
      }
    }
  }

  return false;
}

/** Test-only helper to reset the shared bucket store. */
export function resetRateLimit(): void {
  buckets.clear();
}
