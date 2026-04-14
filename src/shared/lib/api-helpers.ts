import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/shared/lib/auth';
import type { UserRole } from '@prisma/client';

const ADMIN_ROLES = new Set<UserRole>(['admin', 'editor', 'member_manager']);

export async function requireAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return {
      session: null,
      response: NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } },
        { status: 401 },
      ),
    };
  }
  if (!ADMIN_ROLES.has(session.user.role)) {
    return {
      session: null,
      response: NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Insufficient permissions.' } },
        { status: 403 },
      ),
    };
  }
  return { session, response: null };
}

export function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function parsePaginationParams(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 20)));
  const search = searchParams.get('search') ?? undefined;
  return { page, limit, search, searchParams };
}

export async function parseJsonBody(
  request: Request,
): Promise<{ body: unknown; error: null } | { body: null; error: ReturnType<typeof apiError> }> {
  try {
    const body: unknown = await request.json();
    return { body, error: null };
  } catch {
    return { body: null, error: apiError('BAD_REQUEST', 'Invalid JSON body.', 400) };
  }
}

export function paginatedJson(items: unknown[], page: number, limit: number, total: number) {
  return NextResponse.json({ items, page, limit, total });
}

/** Minimal structural interface for Prisma model delegates used in paginated queries. */
export interface PaginatableDelegate {
  findMany(args: {
    where?: Record<string, unknown>;
    skip?: number;
    take?: number;
    orderBy?: Record<string, string>;
    select?: Record<string, boolean>;
  }): Promise<Record<string, unknown>[]>;
  count(args?: { where?: Record<string, unknown> }): Promise<number>;
}

export async function runPaginatedQuery(
  model: PaginatableDelegate,
  where: Record<string, unknown>,
  page: number,
  limit: number,
  extra?: { select?: Record<string, boolean> },
) {
  const [items, total] = await Promise.all([
    model.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      ...(extra?.select && { select: extra.select }),
    }),
    model.count({ where }),
  ]);
  return paginatedJson(items, page, limit, total);
}
