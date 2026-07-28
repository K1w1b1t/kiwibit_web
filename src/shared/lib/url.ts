/**
 * Accepts only absolute http(s) URLs.
 *
 * Used on both sides of the boundary: the admin forms validate as you type, and
 * the API routes re-validate before writing (a client-only check is not a
 * check). Rejecting other schemes is the point — `javascript:` and `data:` must
 * never reach an `href`/`src` we render.
 */
export function isHttpUrl(raw: unknown): boolean {
  if (typeof raw !== 'string') return false;
  const value = raw.trim();
  if (value.length === 0) return false;

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
