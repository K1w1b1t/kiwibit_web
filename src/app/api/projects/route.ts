import { prisma } from '@/shared/lib/prisma';
import { parsePaginationParams, paginatedJson } from '@/shared/lib/api-helpers';

// GET /api/projects
export async function GET(request: Request) {
  const { page, limit, search } = parsePaginationParams(request);

  const where = search
    ? {
        OR: [
          { title: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    prisma.project.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.project.count({ where }),
  ]);

  return paginatedJson(items, page, limit, total);
}
