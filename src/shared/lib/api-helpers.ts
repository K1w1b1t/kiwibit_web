import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/shared/lib/auth';
import type { UserRole } from '@prisma/client';

const ADMIN_ROLES: UserRole[] = ['admin', 'editor', 'member_manager'];

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
  if (!ADMIN_ROLES.includes(session.user.role)) {
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
