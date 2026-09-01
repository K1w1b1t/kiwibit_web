import { NextResponse } from 'next/server';
import { prisma } from '@/shared/lib/prisma';
import { requireAdminSession, apiError } from '@/shared/lib/api-helpers';
import { isLinkedInAccessTokenExpired, scopeAllowsAutoPost } from '@/shared/lib/linkedin';

type Params = { params: Promise<{ id: string }> };

/**
 * Loads the member owner and connection metadata needed by the guards below.
 * Both actions are owner-only ("each manages their own").
 */
async function loadOwnedConnection(id: string, userId: string) {
  const member = await prisma.member.findUnique({
    where: { id },
    select: {
      userId: true,
      linkedinConnection: {
        select: { scope: true, accessTokenExpiry: true, linkedinPersonId: true },
      },
    },
  });
  if (!member) return { error: apiError('NOT_FOUND', 'Member not found.', 404) };
  if (member.userId !== userId) {
    return { error: apiError('FORBIDDEN', 'You can only manage your own LinkedIn.', 403) };
  }
  return { connection: member.linkedinConnection };
}

/**
 * DELETE /api/admin/members/[id]/linkedin
 *
 * Disconnects the member's LinkedIn: deletes the stored (encrypted) token and
 * link. "Each connects their own" — only the owner of this member's account may
 * disconnect. The current avatar is kept; unlinking is not the same as clearing
 * the photo.
 */
export async function DELETE(_request: Request, { params }: Params) {
  const { session, response } = await requireAdminSession();
  if (response || !session) return response;

  const { id } = await params;

  const owned = await loadOwnedConnection(id, session.user.id);
  if (owned.error) return owned.error;

  // Idempotent: nothing to delete is still success from the caller's view.
  await prisma.linkedinConnection.deleteMany({ where: { memberId: id } });

  return NextResponse.json({ success: true });
}

/**
 * PATCH /api/admin/members/[id]/linkedin
 *
 * Toggles the per-member auto-post opt-in (issue #81). Owner-only. Enabling is
 * allowed only when the stored connection already granted `w_member_social`
 * (otherwise the member must reconnect with the extended scope); disabling is
 * always allowed and keeps the token — it just stops future posts.
 */
export async function PATCH(request: Request, { params }: Params) {
  const { session, response } = await requireAdminSession();
  if (response || !session) return response;

  const { id } = await params;

  const body = (await request.json().catch(() => null)) as { autoPostEnabled?: unknown } | null;
  if (!body || typeof body.autoPostEnabled !== 'boolean') {
    return apiError('BAD_REQUEST', 'autoPostEnabled must be a boolean.', 400);
  }
  const autoPostEnabled = body.autoPostEnabled;

  const owned = await loadOwnedConnection(id, session.user.id);
  if (owned.error) return owned.error;
  if (!owned.connection) {
    return apiError('NOT_FOUND', 'This member has no LinkedIn connection.', 404);
  }

  if (autoPostEnabled && !scopeAllowsAutoPost(owned.connection.scope)) {
    return apiError(
      'CONFLICT',
      'Reconnect LinkedIn granting the auto-post permission before enabling it.',
      409,
    );
  }

  if (autoPostEnabled && isLinkedInAccessTokenExpired(owned.connection.accessTokenExpiry)) {
    return apiError(
      'CONFLICT',
      'Reconnect LinkedIn before enabling auto-post because the access token has expired.',
      409,
    );
  }

  if (autoPostEnabled && !owned.connection.linkedinPersonId) {
    return apiError(
      'CONFLICT',
      'Reconnect LinkedIn before enabling auto-post so the Person ID can be stored.',
      409,
    );
  }

  await prisma.linkedinConnection.update({
    where: { memberId: id },
    data: { autoPostEnabled },
  });

  return NextResponse.json({ success: true, data: { autoPostEnabled } });
}
