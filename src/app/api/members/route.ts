import { prisma } from '@/shared/lib/prisma';
import { parsePaginationParams, paginatedJson } from '@/shared/lib/api-helpers';

// GET /api/members
export async function GET(request: Request) {
  const { page, limit, search } = parsePaginationParams(request);

  const where = search ? { name: { contains: search, mode: 'insensitive' as const } } : {};

  const [items, total] = await Promise.all([
    prisma.member.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.member.count({ where }),
  ]);

  return paginatedJson(items, page, limit, total);
}
