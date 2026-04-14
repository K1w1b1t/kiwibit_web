import { prisma } from '@/shared/lib/prisma';
import {
  parsePaginationParams,
  runPaginatedQuery,
  PaginatableDelegate,
} from '@/shared/lib/api-helpers';

// GET /api/posts
export async function GET(request: Request) {
  const { page, limit, search, searchParams } = parsePaginationParams(request);
  const authorId = searchParams.get('authorId') ?? undefined;
  const where: Record<string, unknown> = {
    ...(search && { title: { contains: search, mode: 'insensitive' } }),
    ...(authorId && { authorId }),
  };
  return runPaginatedQuery(prisma.post as unknown as PaginatableDelegate, where, page, limit, {
    select: { id: true, title: true, authorId: true, createdAt: true, updatedAt: true },
  });
}
