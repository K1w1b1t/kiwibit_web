import { normalizePostContent } from '@/entities/post/model/normalize-post-content';
import { parsePostTranslations } from '@/entities/post/model/post-translations';
import { NextResponse } from 'next/server';
import { runAfterResponse } from '@/shared/lib/after-response';
import { prisma } from '@/shared/lib/prisma';
import {
  requireAdminSession,
  requirePanelSession,
  apiError,
  parsePaginationParams,
  parseJsonBody,
  runPaginatedQuery,
  PaginatableDelegate,
} from '@/shared/lib/api-helpers';
import { isPostStatus, resolvePublishedAt } from '@/shared/lib/post-status';
import { isHttpUrl } from '@/shared/lib/url';
import { publishBlogPostToLinkedIn } from '@/shared/lib/linkedin-blog-post';

// GET /api/admin/posts
export async function GET(request: Request) {
  const { session, response } = await requirePanelSession();
  if (response || !session) return response;

  const { page, limit, search, searchParams } = parsePaginationParams(request);
  const authorId = searchParams.get('authorId') ?? undefined;
  const status = searchParams.get('status') ?? undefined;
  const where: Record<string, unknown> = {
    ...(search && {
      OR: ['title', 'titlePt', 'titleEn'].map((field) => ({
        [field]: { contains: search, mode: 'insensitive' },
      })),
    }),
    ...(authorId && { authorId }),
    // Unlike the public route, the admin list shows drafts — unfiltered by default.
    ...(isPostStatus(status) && { status }),
    ...(session.user.role === 'member' && { authorId: session.user.id }),
  };
  return runPaginatedQuery(prisma.post as unknown as PaginatableDelegate, where, page, limit);
}

// POST /api/admin/posts
export async function POST(request: Request) {
  const { session, response } = await requireAdminSession();
  if (response || !session) return response;

  const { body, error } = await parseJsonBody(request);
  if (error) return error;

  const normalized = normalizePostContent(body as Record<string, unknown>);
  if (normalized.error) return apiError('BAD_REQUEST', normalized.error, 400);
  const translated = parsePostTranslations(normalized.body);
  if (translated.error) return apiError('BAD_REQUEST', translated.error, 400);
  const { title, content } = translated.data;
  const { status, coverImageUrl, coverImagePath } = body as Record<string, unknown>;

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
      ...translated.data,
      contentFormat: normalized.body.contentFormat as 'text' | 'html',
      authorId: session.user.id,
      status: resolvedStatus,
      publishedAt: resolvePublishedAt(resolvedStatus, null, new Date()),
      ...(typeof coverImageUrl === 'string' && { coverImageUrl }),
      ...(typeof coverImagePath === 'string' && { coverImagePath }),
    },
  });

  if (post.status === 'published') {
    runAfterResponse(() => publishBlogPostToLinkedIn(post));
  }

  return NextResponse.json({ success: true, data: post }, { status: 201 });
}
