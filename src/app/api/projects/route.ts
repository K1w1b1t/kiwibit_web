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
        OR: ['title', 'description', 'titlePt', 'titleEn', 'descriptionPt', 'descriptionEn'].map(
          (field) => ({ [field]: { contains: search, mode: 'insensitive' } }),
        ),
      }
    : {};
  const featured = new URL(request.url).searchParams.get('featured') === 'true';
  const hasFeatured = featured && (await prisma.project.count({ where: { isFeatured: true } })) > 0;
  if (hasFeatured) where.isFeatured = true;
  return runPaginatedQuery(prisma.project as unknown as PaginatableDelegate, where, page, limit, {
    ...(hasFeatured && {
      orderBy: [{ featuredOrder: 'asc' }, { createdAt: 'desc' }, { id: 'asc' }],
    }),
    select: {
      id: true,
      title: true,
      titlePt: true,
      titleEn: true,
      descriptionPt: true,
      descriptionEn: true,
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
