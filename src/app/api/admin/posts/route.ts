import { NextResponse } from 'next/server';
import { prisma } from '@/shared/lib/prisma';
import {
  requireAdminSession,
  apiError,
  parsePaginationParams,
  parseJsonBody,
  paginatedJson,
} from '@/shared/lib/api-helpers';

// GET /api/admin/posts
export async function GET(request: Request) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { page, limit, search, searchParams } = parsePaginationParams(request);
  const authorId = searchParams.get('authorId') ?? undefined;

  const where = {
    ...(search && { title: { contains: search, mode: 'insensitive' as const } }),
    ...(authorId && { authorId }),
  };

  const [items, total] = await Promise.all([
    prisma.post.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.post.count({ where }),
  ]);

  return paginatedJson(items, page, limit, total);
}

// POST /api/admin/posts
export async function POST(request: Request) {
  const { session, response } = await requireAdminSession();
  if (response || !session) return response;

  const { body, error } = await parseJsonBody(request);
  if (error) return error;

  const { title, content } = body as Record<string, unknown>;

  if (typeof title !== 'string' || title.trim() === '')
    return apiError('BAD_REQUEST', 'title is required.', 400);
  if (typeof content !== 'string' || content.trim() === '')
    return apiError('BAD_REQUEST', 'content is required.', 400);

  const post = await prisma.post.create({
    data: { title, content, authorId: session.user.id },
  });

  return NextResponse.json({ success: true, data: post }, { status: 201 });
}
