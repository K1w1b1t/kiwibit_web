import { prisma } from '@/shared/lib/prisma';
import {
  parsePaginationParams,
  runPaginatedQuery,
  PaginatableDelegate,
} from '@/shared/lib/api-helpers';

// GET /api/posts — public
export async function GET(request: Request) {
  const { page, limit, search, searchParams } = parsePaginationParams(request);
  const authorId = searchParams.get('authorId') ?? undefined;
  const where: Record<string, unknown> = {
    // Drafts must never leak to the public blog.
    status: 'published',
    ...(search && { title: { contains: search, mode: 'insensitive' } }),
    ...(authorId && { authorId }),
  };
  return runPaginatedQuery(prisma.post as unknown as PaginatableDelegate, where, page, limit, {
    select: {
      id: true,
      title: true,
      authorId: true,
      // The public blog shows the author's name, never the raw id.
      author: { select: { name: true } },
      coverImageUrl: true,
      coverImageAlt: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
    },
    // Publication order, not row-creation order. Older rows backfilled by the
    // draft/published migration have publishedAt = createdAt, and the createdAt
    // tiebreak keeps the sort total if publishedAt is ever null.
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
  });
}
