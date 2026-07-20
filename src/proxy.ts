import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import type { UserRole } from '@prisma/client';
import { LOCALE_COOKIE, defaultLocale, isLocale } from '@/shared/i18n/config';
import { matchLocale } from '@/shared/i18n/match-locale';

const ADMIN_ROLES = new Set<UserRole>(['admin', 'editor', 'member_manager']);

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function hasLocalePrefix(pathname: string): boolean {
  const segment = pathname.split('/')[1];
  return typeof segment === 'string' && isLocale(segment);
}

async function guardAdmin(req: NextRequest, pathname: string): Promise<NextResponse> {
  const token = await getToken({ req });

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } },
        { status: 401 },
      );
    }
    // No dedicated /login page exists yet — send unauthenticated visitors home.
    return NextResponse.redirect(new URL('/', req.url));
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

export async function proxy(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;

  // Block 1 — protect admin pages and admin APIs.
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    return guardAdmin(req, pathname);
  }

  // Block 2 — locale negotiation for public pages (never reached for /api, files,
  // or already-prefixed paths thanks to the matcher and this guard).
  if (hasLocalePrefix(pathname)) {
    return NextResponse.next();
  }

  const cookieLocale = req.cookies.get(LOCALE_COOKIE)?.value;
  const locale =
    cookieLocale && isLocale(cookieLocale)
      ? cookieLocale
      : matchLocale(req.headers.get('accept-language')) || defaultLocale;

  const suffix = pathname === '/' ? '' : pathname;
  const redirectUrl = new URL(`/${locale}${suffix}`, req.url);
  redirectUrl.search = req.nextUrl.search;

  const response = NextResponse.redirect(redirectUrl, 307);
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: ONE_YEAR_SECONDS,
    sameSite: 'lax',
  });
  return response;
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/((?!api|admin|_next/static|_next/image|favicon.ico|\\.well-known|.*\\..*).*)',
  ],
};
