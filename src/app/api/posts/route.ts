import { prisma } from '@/shared/lib/prisma';
import { parsePaginationParams, paginatedJson } from '@/shared/lib/api-helpers';

// GET /api/posts
export async function GET(request: Request) {
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
      select: { id: true, title: true, authorId: true, createdAt: true, updatedAt: true },
    }),
    prisma.post.count({ where }),
  ]);

  return paginatedJson(items, page, limit, total);
}
