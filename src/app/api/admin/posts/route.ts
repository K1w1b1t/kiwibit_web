import { NextResponse } from 'next/server';
import { prisma } from '@/shared/lib/prisma';
import { requireAdminSession, apiError } from '@/shared/lib/api-helpers';

// GET /api/admin/posts
export async function GET(request: Request) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 20)));
  const search = searchParams.get('search') ?? undefined;
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

  return NextResponse.json({ items, page, limit, total });
}

// POST /api/admin/posts
export async function POST(request: Request) {
  const { session, response } = await requireAdminSession();
  if (response || !session) return response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON body.', 400);
  }

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
