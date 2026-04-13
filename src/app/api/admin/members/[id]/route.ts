import { NextResponse } from 'next/server';
import { prisma } from '@/shared/lib/prisma';
import { requireAdminSession, apiError } from '@/shared/lib/api-helpers';

type Params = { params: Promise<{ id: string }> };

// GET /api/admin/members/[id]
export async function GET(_req: Request, { params }: Params) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { id } = await params;
  const member = await prisma.member.findUnique({ where: { id } });
  if (!member) return apiError('NOT_FOUND', 'Member not found.', 404);
  return NextResponse.json(member);
}

// PUT /api/admin/members/[id]
export async function PUT(request: Request, { params }: Params) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON body.', 400);
  }

  const { userId, name, bio, avatarUrl } = body as Record<string, unknown>;

  const existing = await prisma.member.findUnique({ where: { id } });
  if (!existing) return apiError('NOT_FOUND', 'Member not found.', 404);

  const updated = await prisma.member.update({
    where: { id },
    data: {
      ...(userId !== undefined && { userId: typeof userId === 'string' ? userId : null }),
      ...(typeof name === 'string' && { name }),
      ...(bio !== undefined && { bio: typeof bio === 'string' ? bio : null }),
      ...(avatarUrl !== undefined && {
        avatarUrl: typeof avatarUrl === 'string' ? avatarUrl : null,
      }),
    },
  });

  return NextResponse.json({ success: true, data: updated });
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
