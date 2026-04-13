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
