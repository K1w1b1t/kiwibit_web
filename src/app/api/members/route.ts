import { prisma } from '@/shared/lib/prisma';
import {
  parsePaginationParams,
  runPaginatedQuery,
  PaginatableDelegate,
} from '@/shared/lib/api-helpers';

// GET /api/members
export async function GET(request: Request) {
  const { page, limit, search } = parsePaginationParams(request);
  const where: Record<string, unknown> = search
    ? { name: { contains: search, mode: 'insensitive' } }
    : {};
  return runPaginatedQuery(prisma.member as unknown as PaginatableDelegate, where, page, limit);
}
