import { invalid, valid, type Validated } from '@/shared/lib/api-helpers';

export type ProjectImageUpdateInput = {
  /** Absent means "leave alt alone"; `null` clears it. Blank strings normalise to `null`. */
  alt?: string | null;
  isCover?: boolean;
};

/** Server-side shape check for `PUT /api/admin/projects/[id]/images/[imageId]`. */
export function validateUpdateProjectImageBody(body: unknown): Validated<ProjectImageUpdateInput> {
  const { alt, isCover } = body as Record<string, unknown>;

  if (alt !== undefined && alt !== null && typeof alt !== 'string') {
    return invalid('BAD_REQUEST', 'alt must be a string or null.', 400);
  }
  if (isCover !== undefined && typeof isCover !== 'boolean') {
    return invalid('BAD_REQUEST', 'isCover must be a boolean.', 400);
  }

  return valid({
    ...(alt !== undefined && { alt: typeof alt === 'string' ? alt.trim() || null : null }),
    ...(isCover !== undefined && { isCover }),
  });
}
