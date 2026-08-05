import { prisma } from '@/shared/lib/prisma';
import {
  parsePaginationParams,
  runPaginatedQuery,
  PaginatableDelegate,
} from '@/shared/lib/api-helpers';

// GET /api/projects — public
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
  return runPaginatedQuery(prisma.project as unknown as PaginatableDelegate, where, page, limit, {
    select: {
      id: true,
      title: true,
      description: true,
      repoUrl: true,
      liveUrl: true,
      createdAt: true,
      updatedAt: true,
      // The carousel needs the whole ordered set, not just the cover.
      // `storagePath` stays out — it is an internal bucket key.
      images: {
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
        select: { id: true, url: true, alt: true, isCover: true },
      },
    },
  });
}
