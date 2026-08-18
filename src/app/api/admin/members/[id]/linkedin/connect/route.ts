import { randomUUID } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/shared/lib/prisma';
import { requireAdminSession } from '@/shared/lib/api-helpers';
import {
  authorizeUrl,
  isLinkedinConfigured,
  LINKEDIN_AUTOPOST_FLAG,
  LINKEDIN_AUTOPOST_SCOPE,
  LINKEDIN_OAUTH_COOKIE,
  LINKEDIN_SCOPE,
} from '@/shared/lib/linkedin';
import { isTokenCryptoConfigured } from '@/shared/lib/token-crypto';
import { absoluteUrl } from '@/shared/lib/seo';

type Params = { params: Promise<{ id: string }> };

function backToEdit(id: string, status: 'error' | 'forbidden') {
  return NextResponse.redirect(absoluteUrl(`/admin/members/${id}/edit?linkedin=${status}`));
}

/**
 * GET /api/admin/members/[id]/linkedin/connect
 *
 * Starts the LinkedIn OAuth flow for the member's OWN profile, then redirects to
 * LinkedIn's consent screen. "Each connects their own": only the signed-in user
 * whose account is linked to this member may connect.
 *
 * A GET (not a fetch) because it ends in a top-level browser redirect to
 * LinkedIn; the CSRF `state` is mirrored into an httpOnly cookie and checked on
 * the callback.
 *
 * `?autopost=1` requests the extended `w_member_social` scope so the member can
 * enable auto-posting to their own profile (issue #81); without it, the flow
 * only grants the basic OIDC scope used for photo sync.
 */
export async function GET(request: NextRequest, { params }: Params) {
  const { session, response } = await requireAdminSession();
  if (response || !session) return response;

  const { id } = await params;

  if (!isLinkedinConfigured() || !isTokenCryptoConfigured()) {
    return backToEdit(id, 'error');
  }

  const member = await prisma.member.findUnique({ where: { id }, select: { userId: true } });
  if (!member || member.userId !== session.user.id) {
    return backToEdit(id, 'forbidden');
  }

  const wantsAutoPost = request.nextUrl.searchParams.get('autopost') === '1';
  const scope = wantsAutoPost ? LINKEDIN_AUTOPOST_SCOPE : LINKEDIN_SCOPE;

  const state = randomUUID();
  // The requested intent rides the state cookie so the callback knows whether to
  // enable the opt-in (the granted scope is still re-checked there).
  const cookieValue = wantsAutoPost ? `${state}:${id}:${LINKEDIN_AUTOPOST_FLAG}` : `${state}:${id}`;

  const redirect = NextResponse.redirect(authorizeUrl(state, scope));

  // Binds the callback to this browser and this member. Short-lived; cleared on
  // the callback. `lax` so it rides the top-level GET navigation back from
  // LinkedIn; `httpOnly` so client JS cannot read the CSRF value.
  redirect.cookies.set(LINKEDIN_OAUTH_COOKIE, cookieValue, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 600,
  });

  return redirect;
}
