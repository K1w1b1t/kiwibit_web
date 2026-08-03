import { NextResponse } from 'next/server';
import { prisma } from '@/shared/lib/prisma';
import {
  requireAdminSession,
  apiError,
  parseJsonBody,
  failureResponse,
} from '@/shared/lib/api-helpers';
import { validateUpdateMemberBody } from '@/features/admin/members/model/validate-member-body';
import { isForeignKeyError, isUniqueConstraintError } from '@/shared/lib/prisma-errors';

type Params = { params: Promise<{ id: string }> };

// GET /api/admin/members/[id]
export async function GET(_req: Request, { params }: Params) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { id } = await params;
  const member = await prisma.member.findUnique({
    where: { id },
    // The edit screen must always show whether an account is associated.
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
  });
  if (!member) return apiError('NOT_FOUND', 'Member not found.', 404);
  return NextResponse.json(member);
}

// PUT /api/admin/members/[id]
export async function PUT(request: Request, { params }: Params) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { id } = await params;

  const { body, error } = await parseJsonBody(request);
  if (error) return error;

  const existing = await prisma.member.findUnique({ where: { id } });
  if (!existing) return apiError('NOT_FOUND', 'Member not found.', 404);

  const parsed = validateUpdateMemberBody(body);
  if (parsed.failure) return failureResponse(parsed.failure);

  try {
    const updated = await prisma.member.update({ where: { id }, data: parsed.data });

    return NextResponse.json({ success: true, data: updated });
  } catch (caught) {
    if (isForeignKeyError(caught)) {
      return apiError('BAD_REQUEST', 'userId does not reference an existing user.', 400);
    }
    if (isUniqueConstraintError(caught)) {
      return apiError('CONFLICT', 'This user is already linked to a member.', 409);
    }
    throw caught;
  }
}

// DELETE /api/admin/members/[id]
export async function DELETE(_req: Request, { params }: Params) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { id } = await params;
  const existing = await prisma.member.findUnique({ where: { id } });
  if (!existing) return apiError('NOT_FOUND', 'Member not found.', 404);

  await prisma.member.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
