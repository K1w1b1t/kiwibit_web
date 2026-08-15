import { randomUUID } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/shared/lib/prisma';
import { requireAdminSession } from '@/shared/lib/api-helpers';
import { authorizeUrl, generatePkce, isLinkedinConfigured, LINKEDIN_OAUTH_COOKIE } from '@/shared/lib/linkedin';
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
 * LinkedIn; the CSRF `state` and PKCE `codeVerifier` are mirrored into an httpOnly
 * cookie and checked on the callback.
 */
export async function GET(_request: NextRequest, { params }: Params) {
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

  const state = randomUUID();
  const { codeVerifier, codeChallenge } = generatePkce();
  const redirect = NextResponse.redirect(authorizeUrl(state, codeChallenge));

  // Binds the callback to this browser and this member. Short-lived; cleared on
  // the callback. `lax` so it rides the top-level GET navigation back from
  // LinkedIn; `httpOnly` so client JS cannot read the CSRF value.
  redirect.cookies.set(LINKEDIN_OAUTH_COOKIE, `${state}:${codeVerifier}:${id}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 600,
  });

  return redirect;
}
