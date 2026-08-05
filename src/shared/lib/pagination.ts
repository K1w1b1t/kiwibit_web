/** Page-size choices offered by every admin list screen. */
export const LIMIT_OPTIONS = [10, 20, 50] as const;

export type Limit = (typeof LIMIT_OPTIONS)[number];

export const DEFAULT_LIMIT: Limit = 20;

/** Falls back to DEFAULT_LIMIT for anything that is not an offered option. */
export function parseLimitParam(raw: string | undefined): Limit {
  const n = Number(raw);
  return (LIMIT_OPTIONS as readonly number[]).includes(n) ? (n as Limit) : DEFAULT_LIMIT;
}

/** Clamps to 1; `NaN`, `0` and negatives all become page 1. */
export function parsePageParam(raw: string | undefined): number {
  const n = Math.trunc(Number(raw));
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/** Always at least 1, so an empty list still renders "Página 1 de 1". */
export function countTotalPages(total: number, pageSize: number): number {
  if (pageSize <= 0) return 1;
  return Math.max(1, Math.ceil(total / pageSize));
}
