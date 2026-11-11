import type { UserRole } from '@prisma/client';
import { prisma } from '@/shared/lib/prisma';
import { apiError } from '@/shared/lib/api-helpers';
import type { UploadScope } from '@/shared/lib/validate-image-file';

export async function resolvePostUploadOwner(
  user: { id: string; role: UserRole },
  scope: UploadScope,
  postId: FormDataEntryValue | null,
) {
  const member = user.role === 'member';
  const forbidden = () => ({
    ownerId: null,
    error: apiError('FORBIDDEN', 'A post owned by the member is required.', 403),
  });
  if (scope !== 'posts') {
    if (member && scope !== 'members') return forbidden();
    return { ownerId: user.id, error: null };
  }
  if (typeof postId !== 'string') {
    if (member) return forbidden();
    return { ownerId: user.id, error: null };
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(postId)) {
    if (member) return forbidden();
    return { ownerId: null, error: apiError('BAD_REQUEST', 'Invalid postId.', 400) };
  }
  const post = await prisma.post.findUnique({ where: { id: postId }, select: { authorId: true } });
  if (member && post?.authorId !== user.id) return forbidden();
  if (!post) return { ownerId: null, error: apiError('NOT_FOUND', 'Post not found.', 404) };
  return { ownerId: post.authorId, error: null };
}
