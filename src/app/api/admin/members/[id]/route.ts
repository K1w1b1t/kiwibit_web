import { NextResponse } from 'next/server';
import { prisma } from '@/shared/lib/prisma';
import { requireAdminSession, apiError, parseJsonBody } from '@/shared/lib/api-helpers';
import { isHttpUrl } from '@/shared/lib/url';
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

  const { userId, name, bio, avatarUrl } = body as Record<string, unknown>;

  const existing = await prisma.member.findUnique({ where: { id } });
  if (!existing) return apiError('NOT_FOUND', 'Member not found.', 404);

  if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
    return apiError('BAD_REQUEST', 'name must be a non-empty string.', 400);
  }
  if (typeof avatarUrl === 'string' && avatarUrl !== '' && !isHttpUrl(avatarUrl)) {
    return apiError('BAD_REQUEST', 'avatarUrl must be an http(s) URL.', 400);
  }

  try {
    const updated = await prisma.member.update({
      where: { id },
      data: {
        // `null` clears the column; an absent key leaves it untouched.
        ...(userId !== undefined && { userId: typeof userId === 'string' ? userId : null }),
        ...(typeof name === 'string' && { name: name.trim() }),
        ...(bio !== undefined && { bio: typeof bio === 'string' ? bio : null }),
        ...(avatarUrl !== undefined && {
          avatarUrl: typeof avatarUrl === 'string' ? avatarUrl : null,
        }),
      },
    });

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
