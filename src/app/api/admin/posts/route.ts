import { NextResponse } from 'next/server';
import { runAfterResponse } from '@/shared/lib/after-response';
import { prisma } from '@/shared/lib/prisma';
import {
  requireAdminSession,
  apiError,
  parsePaginationParams,
  parseJsonBody,
  runPaginatedQuery,
  PaginatableDelegate,
} from '@/shared/lib/api-helpers';
import { isPostStatus, resolvePublishedAt } from '@/shared/lib/post-status';
import { isHttpUrl } from '@/shared/lib/url';
import { triggerLinkedInAutoPostForBlog } from '@/shared/lib/linkedin';

// GET /api/admin/posts
export async function GET(request: Request) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { page, limit, search, searchParams } = parsePaginationParams(request);
  const authorId = searchParams.get('authorId') ?? undefined;
  const status = searchParams.get('status') ?? undefined;
  const where: Record<string, unknown> = {
    ...(search && { title: { contains: search, mode: 'insensitive' } }),
    ...(authorId && { authorId }),
    // Unlike the public route, the admin list shows drafts — unfiltered by default.
    ...(isPostStatus(status) && { status }),
  };
  return runPaginatedQuery(prisma.post as unknown as PaginatableDelegate, where, page, limit);
}

// POST /api/admin/posts
export async function POST(request: Request) {
  const { session, response } = await requireAdminSession();
  if (response || !session) return response;

  const { body, error } = await parseJsonBody(request);
  if (error) return error;

  const { title, content, status, coverImageUrl, coverImagePath, coverImageAlt } = body as Record<
    string,
    unknown
  >;

  if (typeof title !== 'string' || title.trim() === '')
    return apiError('BAD_REQUEST', 'title is required.', 400);
  if (typeof content !== 'string' || content.trim() === '')
    return apiError('BAD_REQUEST', 'content is required.', 400);
  if (status !== undefined && !isPostStatus(status))
    return apiError('BAD_REQUEST', 'status must be draft or published.', 400);
  if (typeof coverImageUrl === 'string' && coverImageUrl !== '' && !isHttpUrl(coverImageUrl))
    return apiError('BAD_REQUEST', 'coverImageUrl must be an http(s) URL.', 400);

  // Defaults to draft: a post should not go live the instant it is saved.
  const resolvedStatus = isPostStatus(status) ? status : 'draft';

  const post = await prisma.post.create({
    data: {
      title,
      content,
      authorId: session.user.id,
      status: resolvedStatus,
      publishedAt: resolvePublishedAt(resolvedStatus, null, new Date()),
      ...(typeof coverImageUrl === 'string' && { coverImageUrl }),
      ...(typeof coverImagePath === 'string' && { coverImagePath }),
      ...(typeof coverImageAlt === 'string' && { coverImageAlt }),
    },
  });

  if (post.status === 'published') {
    runAfterResponse(() => triggerLinkedInAutoPostForBlog(post));
  }

  return NextResponse.json({ success: true, data: post }, { status: 201 });
}
