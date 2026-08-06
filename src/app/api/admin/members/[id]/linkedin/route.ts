import { NextResponse } from 'next/server';
import { prisma } from '@/shared/lib/prisma';
import { requireAdminSession, apiError } from '@/shared/lib/api-helpers';

type Params = { params: Promise<{ id: string }> };

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

  const member = await prisma.member.findUnique({ where: { id }, select: { userId: true } });
  if (!member) return apiError('NOT_FOUND', 'Member not found.', 404);
  if (member.userId !== session.user.id) {
    return apiError('FORBIDDEN', 'You can only disconnect your own LinkedIn.', 403);
  }

  // Idempotent: nothing to delete is still success from the caller's view.
  await prisma.linkedinConnection.deleteMany({ where: { memberId: id } });

  return NextResponse.json({ success: true });
}
