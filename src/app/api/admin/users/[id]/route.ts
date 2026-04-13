import { NextResponse } from 'next/server';
import { prisma } from '@/shared/lib/prisma';
import { requireAdminSession, apiError } from '@/shared/lib/api-helpers';

type Params = { params: Promise<{ id: string }> };

// GET /api/admin/users/[id]
export async function GET(_req: Request, { params }: Params) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true },
  });

  if (!user) return apiError('NOT_FOUND', 'User not found.', 404);
  return NextResponse.json(user);
}

// PUT /api/admin/users/[id]
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

  const { name, email, role, password } = body as Record<string, unknown>;

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return apiError('NOT_FOUND', 'User not found.', 404);

  let hashedPassword: string | undefined;
  if (typeof password === 'string') {
    const { hash } = await import('bcryptjs');
    hashedPassword = await hash(password, 12);
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(typeof name === 'string' && { name }),
      ...(typeof email === 'string' && { email }),
      ...(role !== undefined && { role: role as import('@prisma/client').UserRole }),
      ...(hashedPassword !== undefined && { password: hashedPassword }),
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json({ success: true, data: updated });
}

// DELETE /api/admin/users/[id]
export async function DELETE(_req: Request, { params }: Params) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { id } = await params;
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return apiError('NOT_FOUND', 'User not found.', 404);

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
