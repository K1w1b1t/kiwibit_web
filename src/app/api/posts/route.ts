import { NextResponse } from 'next/server';
import { prisma } from '@/shared/lib/prisma';

// GET /api/posts
export async function GET(request: Request) {
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
      select: { id: true, title: true, authorId: true, createdAt: true, updatedAt: true },
    }),
    prisma.post.count({ where }),
  ]);

  return NextResponse.json({ items, page, limit, total });
}
