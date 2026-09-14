import { NextResponse } from 'next/server';
import { validateUpdateMemberBody } from '@/features/admin/members/model/validate-member-body';
import {
  apiError,
  failureResponse,
  parseJsonBody,
  requirePanelSession,
} from '@/shared/lib/api-helpers';
import { prisma } from '@/shared/lib/prisma';

export async function PUT(request: Request) {
  const { session, response } = await requirePanelSession();
  if (response || !session) return response;

  if (session.user.role !== 'member') {
    return apiError('FORBIDDEN', 'Only members can update their own profile here.', 403);
  }

  const { body, error } = await parseJsonBody(request);
  if (error) return error;
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return apiError('BAD_REQUEST', 'Request body must be an object.', 400);
  }

  const bodyRecord = body as Record<string, unknown>;
  if (bodyRecord.userId !== undefined) {
    return apiError('BAD_REQUEST', 'userId cannot be updated from a member profile.', 400);
  }

  const parsed = validateUpdateMemberBody(body);
  if (parsed.failure) return failureResponse(parsed.failure);

  const member = await prisma.member.findUnique({ where: { userId: session.user.id } });
  if (!member) return apiError('NOT_FOUND', 'Member profile not found.', 404);

  const updated = await prisma.member.update({ where: { id: member.id }, data: parsed.data });
  return NextResponse.json({ success: true, data: updated });
}
