import type { PostStatus } from '@prisma/client';

export const POST_STATUSES = ['draft', 'published'] as const;

export const POST_STATUS_LABELS: Record<PostStatus, string> = {
  draft: 'Rascunho',
  published: 'Publicado',
};

export function isPostStatus(value: unknown): value is PostStatus {
  return typeof value === 'string' && (POST_STATUSES as readonly string[]).includes(value);
}

/**
 * `publishedAt` is stamped the first time a post goes live and then kept, so
 * unpublishing and republishing does not reshuffle the public ordering.
 */
export function resolvePublishedAt(
  status: PostStatus,
  currentPublishedAt: Date | null,
  now: Date,
): Date | null {
  if (status !== 'published') return currentPublishedAt;
  return currentPublishedAt ?? now;
}
