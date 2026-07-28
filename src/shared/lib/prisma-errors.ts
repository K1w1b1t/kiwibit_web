/**
 * Prisma error-code helpers.
 *
 * A `findUnique` pre-check always races the insert that follows it, so unique
 * violations must also be caught at write time — otherwise they surface as a
 * 500 instead of a 409.
 */
type PrismaLikeError = { code?: unknown };

function codeOf(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) return null;
  const code = (error as PrismaLikeError).code;
  return typeof code === 'string' ? code : null;
}

/** P2002 — unique constraint failed. */
export function isUniqueConstraintError(error: unknown): boolean {
  return codeOf(error) === 'P2002';
}

/** P2025 — record required for the operation was not found. */
export function isRecordNotFoundError(error: unknown): boolean {
  return codeOf(error) === 'P2025';
}

/** P2003 — foreign key constraint failed (e.g. a userId that does not exist). */
export function isForeignKeyError(error: unknown): boolean {
  return codeOf(error) === 'P2003';
}
