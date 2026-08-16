import { randomUUID } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/shared/lib/prisma';
import { requireAdminSession } from '@/shared/lib/api-helpers';
import {
  exchangeCode,
  fetchUserinfo,
  isLinkedinConfigured,
  LINKEDIN_OAUTH_COOKIE,
  parseOauthCookie,
} from '@/shared/lib/linkedin';
import { encryptToken, isTokenCryptoConfigured } from '@/shared/lib/token-crypto';
import { deleteObjects, isStorageConfigured, putObject } from '@/shared/lib/storage';
import { extensionForType, sniffImageType } from '@/shared/lib/validate-image-file';
import { absoluteUrl } from '@/shared/lib/seo';

/**
 * GET /api/admin/members/linkedin/callback
 *
 * Fixed redirect URI for the LinkedIn OAuth flow — the member id travels in the
 * `state` cookie, not the URL, since LinkedIn matches the redirect URI exactly.
 *
 * Under `/api/admin`, so `proxy.ts` already requires an admin JWT, and the
 * `sameSite: lax` session cookie rides the top-level GET navigation back from
 * LinkedIn.
 */

function redirectEdit(memberId: string, status: 'connected' | 'error' | 'forbidden') {
  const redirect = NextResponse.redirect(
    absoluteUrl(`/admin/members/${memberId}/edit?linkedin=${status}`),
  );
  // The one-shot OAuth cookie has served its purpose either way.
  redirect.cookies.delete(LINKEDIN_OAUTH_COOKIE);
  return redirect;
}

/**
 * Downloads the LinkedIn photo and rehosts it to the OCI bucket, matching the
 * avatar upload path. Returns the new `{ url, path }`, or null when the photo is
 * missing/unusable or storage is unavailable — connection still succeeds, the
 * old avatar just stays.
 */
async function syncPhoto(pictureUrl: string | null): Promise<{ url: string; path: string } | null> {
  if (!pictureUrl || !isStorageConfigured()) return null;

  try {
    const parsedUrl = new URL(pictureUrl);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) return null;

    const response = await fetch(pictureUrl, {
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return null;

    const bytes = new Uint8Array(await response.arrayBuffer());
    // The remote bytes are attacker-influenceable; trust the magic bytes, not
    // the Content-Type, exactly like the upload route does.
    const type = sniffImageType(bytes);
    if (!type) return null;

    const key = `members/${randomUUID()}.${extensionForType(type)}`;
    const result = await putObject(key, bytes, type);
    return result.ok ? { url: result.url, path: result.key } : null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { session, response } = await requireAdminSession();
  if (response || !session) return response;

  const cookie = parseOauthCookie(request.cookies.get(LINKEDIN_OAUTH_COOKIE)?.value);
  // With no cookie there is no member to redirect back to; land on the list.
  if (!cookie) return NextResponse.redirect(absoluteUrl('/admin/members'));
  const { state, memberId } = cookie;

  const params = request.nextUrl.searchParams;
  // LinkedIn returns `error` when the member declines consent.
  if (params.get('error') || params.get('state') !== state) {
    return redirectEdit(memberId, 'error');
  }

  const code = params.get('code');
  if (!code || !isLinkedinConfigured() || !isTokenCryptoConfigured()) {
    return redirectEdit(memberId, 'error');
  }

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { userId: true, avatarPath: true },
  });
  // Re-check ownership: the cookie is bound to a browser, not re-authorized here.
  if (!member || member.userId !== session.user.id) {
    return redirectEdit(memberId, 'forbidden');
  }

  try {
    const token = await exchangeCode(code);
    const userinfo = await fetchUserinfo(token.accessToken);

    // Prevent binding the same LinkedIn account to another member
    const existingConnection = await prisma.linkedinConnection.findUnique({
      where: { linkedinSub: userinfo.sub },
      select: { memberId: true },
    });
    if (existingConnection && existingConnection.memberId !== memberId) {
      return redirectEdit(memberId, 'error');
    }

    const photo = await syncPhoto(userinfo.picture);

    const expiry = new Date(Date.now() + token.expiresInSeconds * 1000);
    const accessTokenEnc = encryptToken(token.accessToken);

    await prisma.$transaction(async (tx) => {
      if (photo) {
        await tx.member.update({
          where: { id: memberId },
          data: { avatarUrl: photo.url, avatarPath: photo.path },
        });
      }
      await tx.linkedinConnection.upsert({
        where: { memberId },
        create: {
          memberId,
          linkedinSub: userinfo.sub,
          scope: token.scope,
          accessTokenEnc,
          accessTokenExpiry: expiry,
        },
        update: {
          linkedinSub: userinfo.sub,
          scope: token.scope,
          accessTokenEnc,
          accessTokenExpiry: expiry,
        },
      });
    });

    // Replaced a bucket-hosted avatar: drop the old object (best-effort).
    if (photo && member.avatarPath) {
      await deleteObjects([member.avatarPath]);
    }

    return redirectEdit(memberId, 'connected');
  } catch (error) {
    console.error('[LinkedIn OAuth Callback Error]', error);
    return redirectEdit(memberId, 'error');
  }
}
