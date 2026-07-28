import { NextResponse } from 'next/server';
import { prisma } from '@/shared/lib/prisma';
import { requireAdminSession, apiError, parseJsonBody } from '@/shared/lib/api-helpers';
import { isPostStatus, resolvePublishedAt } from '@/shared/lib/post-status';
import { isHttpUrl } from '@/shared/lib/url';
import { deleteObjects } from '@/shared/lib/storage';

type Params = { params: Promise<{ id: string }> };

// GET /api/admin/posts/[id]
export async function GET(_req: Request, { params }: Params) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { id } = await params;
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) return apiError('NOT_FOUND', 'Post not found.', 404);
  return NextResponse.json(post);
}

// PUT /api/admin/posts/[id]
export async function PUT(request: Request, { params }: Params) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { id } = await params;

  const { body, error } = await parseJsonBody(request);
  if (error) return error;

  const { title, content, status, coverImageUrl, coverImagePath, coverImageAlt } = body as Record<
    string,
    unknown
  >;

  const existing = await prisma.post.findUnique({ where: { id } });
  if (!existing) return apiError('NOT_FOUND', 'Post not found.', 404);

  if (title !== undefined && (typeof title !== 'string' || title.trim() === ''))
    return apiError('BAD_REQUEST', 'title must be a non-empty string.', 400);
  if (content !== undefined && (typeof content !== 'string' || content.trim() === ''))
    return apiError('BAD_REQUEST', 'content must be a non-empty string.', 400);
  if (status !== undefined && !isPostStatus(status))
    return apiError('BAD_REQUEST', 'status must be draft or published.', 400);
  if (typeof coverImageUrl === 'string' && coverImageUrl !== '' && !isHttpUrl(coverImageUrl))
    return apiError('BAD_REQUEST', 'coverImageUrl must be an http(s) URL.', 400);

  const updated = await prisma.post.update({
    where: { id },
    data: {
      ...(typeof title === 'string' && { title }),
      ...(typeof content === 'string' && { content }),
      ...(isPostStatus(status) && {
        status,
        publishedAt: resolvePublishedAt(status, existing.publishedAt, new Date()),
      }),
      // `null` clears the cover; an absent key leaves it untouched.
      ...(coverImageUrl !== undefined && {
        coverImageUrl: typeof coverImageUrl === 'string' ? coverImageUrl : null,
      }),
      ...(coverImagePath !== undefined && {
        coverImagePath: typeof coverImagePath === 'string' ? coverImagePath : null,
      }),
      ...(coverImageAlt !== undefined && {
        coverImageAlt: typeof coverImageAlt === 'string' ? coverImageAlt : null,
      }),
    },
  });

  // The cover was replaced or cleared: drop the object that is no longer
  // referenced, but only after the row committed.
  const previousPath = existing.coverImagePath;
  if (previousPath && previousPath !== updated.coverImagePath) {
    await deleteObjects([previousPath]);
  }

  return NextResponse.json({ success: true, data: updated });
}

// DELETE /api/admin/posts/[id]
export async function DELETE(_req: Request, { params }: Params) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { id } = await params;
  const existing = await prisma.post.findUnique({ where: { id } });
  if (!existing) return apiError('NOT_FOUND', 'Post not found.', 404);

  await prisma.post.delete({ where: { id } });

  // DB first, then best-effort object cleanup. A null path means the cover was a
  // pasted external URL and is not ours to delete.
  if (existing.coverImagePath) {
    await deleteObjects([existing.coverImagePath]);
  }

  return NextResponse.json({ success: true });
}
