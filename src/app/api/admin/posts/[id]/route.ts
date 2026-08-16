import { NextResponse } from 'next/server';
import { runAfterResponse } from '@/shared/lib/after-response';
import { prisma } from '@/shared/lib/prisma';
import {
  requireAdminSession,
  apiError,
  parseJsonBody,
  failureResponse,
} from '@/shared/lib/api-helpers';
import {
  validateUpdatePostBody,
  toPostUpdateData,
} from '@/features/admin/posts/model/validate-post-body';
import { deleteObjects } from '@/shared/lib/storage';
import { triggerLinkedInAutoPostForBlog } from '@/shared/lib/linkedin';

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

  const existing = await prisma.post.findUnique({ where: { id } });
  if (!existing) return apiError('NOT_FOUND', 'Post not found.', 404);

  const parsed = validateUpdatePostBody(body);
  if (parsed.failure) return failureResponse(parsed.failure);

  const updated = await prisma.post.update({
    where: { id },
    data: toPostUpdateData(parsed.data, existing.publishedAt, new Date()),
  });

  if (updated.status === 'published' && existing.status !== 'published') {
    runAfterResponse(() => triggerLinkedInAutoPostForBlog(updated));
  }

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
