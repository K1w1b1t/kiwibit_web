import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import type { UserRole } from '@prisma/client';

const ADMIN_ROLES = new Set<UserRole>(['admin', 'editor', 'member_manager']);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = await getToken({ req });

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } },
        { status: 401 },
      );
    }
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const role = token.role;
  if (!role || !ADMIN_ROLES.has(role)) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Insufficient permissions.' } },
        { status: 403 },
      );
    }
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
