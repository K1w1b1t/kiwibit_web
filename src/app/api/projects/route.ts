import { prisma } from '@/shared/lib/prisma';
import {
  parsePaginationParams,
  runPaginatedQuery,
  PaginatableDelegate,
} from '@/shared/lib/api-helpers';

// GET /api/projects
export async function GET(request: Request) {
  const { page, limit, search } = parsePaginationParams(request);
  const where: Record<string, unknown> = search
    ? {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }
    : {};
  return runPaginatedQuery(prisma.project as unknown as PaginatableDelegate, where, page, limit);
}
