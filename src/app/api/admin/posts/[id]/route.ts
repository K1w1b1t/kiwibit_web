import { normalizePostContent } from '@/entities/post/model/normalize-post-content';
import { parsePostTranslations } from '@/entities/post/model/post-translations';
import { NextResponse } from 'next/server';
import { prisma } from '@/shared/lib/prisma';
import {
  requireAdminSession,
  requirePanelSession,
  apiError,
  parseJsonBody,
  failureResponse,
} from '@/shared/lib/api-helpers';
import {
  validateUpdatePostBody,
  toPostUpdateData,
} from '@/features/admin/posts/model/validate-post-body';
import { deleteUnreferencedPostImage } from '@/entities/post/model/delete-unreferenced-image';
import { lockPostMedia, syncPostMedia, trackPostImages } from '@/entities/post/model/post-media';
import type { Post } from '@prisma/client';
import { postWriteFailure } from '@/features/admin/posts/model/post-write-failure';

type Params = { params: Promise<{ id: string }> };

// GET /api/admin/posts/[id]
export async function GET(_req: Request, { params }: Params) {
  const { session, response } = await requirePanelSession();
  if (response || !session) return response;

  const { id } = await params;
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) return apiError('NOT_FOUND', 'Post not found.', 404);
  if (session.user.role === 'member' && post.authorId !== session.user.id) {
    return apiError('FORBIDDEN', 'Insufficient permissions.', 403);
  }
  return NextResponse.json(post);
}

// PUT /api/admin/posts/[id]
export async function PUT(request: Request, { params }: Params) {
  const { session, response } = await requirePanelSession();
  if (response || !session) return response;

  const { id } = await params;

  const { body, error } = await parseJsonBody(request);
  if (error) return error;

  const existing = await prisma.post.findUnique({ where: { id } });
  if (!existing) return apiError('NOT_FOUND', 'Post not found.', 404);
  if (session.user.role === 'member' && existing.authorId !== session.user.id) {
    return apiError('FORBIDDEN', 'Insufficient permissions.', 403);
  }

  const normalized = normalizePostContent(body as Record<string, unknown>, existing);
  if (normalized.error) return apiError('BAD_REQUEST', normalized.error, 400);
  const translated = parsePostTranslations(normalized.body, existing);
  if (translated.error) return apiError('BAD_REQUEST', translated.error, 400);
  const parsed = validateUpdatePostBody({
    ...(body as Record<string, unknown>),
    title: translated.data.title,
    content: translated.data.content,
  });
  if (parsed.failure) return failureResponse(parsed.failure);
  if (session.user.role === 'member' && parsed.data.status === 'published') {
    return apiError('FORBIDDEN', 'Only administrators can publish posts.', 403);
  }

  let updated: Post;
  try {
    updated = await prisma.$transaction(async (tx) => {
      await lockPostMedia(tx);
      await trackPostImages(tx, existing);
      const updated = await tx.post.update({
        where: { id },
        data: {
          ...toPostUpdateData(parsed.data, existing.publishedAt, new Date()),
          ...translated.data,
          contentFormat: normalized.body.contentFormat as 'text' | 'html' | 'markdown',
        },
      });
      await syncPostMedia(tx, updated);
      return updated;
    });
  } catch (error) {
    return postWriteFailure(error);
  }

  // The cover was replaced or cleared: drop the object that is no longer
  // referenced, but only after the row committed.
  const previousPath = existing.coverImagePath;
  if (previousPath && previousPath !== updated.coverImagePath) {
    await deleteUnreferencedPostImage(previousPath);
  }

  return NextResponse.json({ success: true, data: updated });
}

// DELETE /api/admin/posts/[id]
export async function DELETE(_req: Request, { params }: Params) {
  const { session, response } = await requireAdminSession();
  if (response || !session) return response;

  const { id } = await params;
  const existing = await prisma.post.findUnique({ where: { id } });
  if (!existing) return apiError('NOT_FOUND', 'Post not found.', 404);
  const media = await prisma.$transaction(async (tx) => {
    await lockPostMedia(tx);
    await trackPostImages(tx, existing);
    const media = await tx.postMedia.findMany({
      where: { postId: id },
      select: { storagePath: true },
    });
    await tx.post.delete({ where: { id } });
    return media;
  });

  // DB first, then best-effort object cleanup. A null path means the cover was a
  // pasted external URL and is not ours to delete.
  if (existing.coverImagePath) {
    await deleteUnreferencedPostImage(existing.coverImagePath);
  }
  await Promise.all(
    media
      .filter((image) => image.storagePath !== existing.coverImagePath)
      .map((image) => deleteUnreferencedPostImage(image.storagePath)),
  );

  return NextResponse.json({ success: true });
}
