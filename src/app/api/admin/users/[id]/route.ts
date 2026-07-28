import { NextResponse } from 'next/server';
import { prisma } from '@/shared/lib/prisma';
import { requireAdminSession, apiError, parseJsonBody } from '@/shared/lib/api-helpers';
import { isUserRole, isPrivilegedRole } from '@/shared/lib/roles';
import { isValidEmail } from '@/shared/lib/email';
import { checkPassword, PASSWORD_HASH_ROUNDS } from '@/shared/lib/password';
import { isUniqueConstraintError } from '@/shared/lib/prisma-errors';

type Params = { params: Promise<{ id: string }> };

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;

// GET /api/admin/users/[id]
export async function GET(_req: Request, { params }: Params) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { ...USER_SELECT },
  });

  if (!user) return apiError('NOT_FOUND', 'User not found.', 404);
  return NextResponse.json(user);
}

// PUT /api/admin/users/[id]
export async function PUT(request: Request, { params }: Params) {
  const { session, response } = await requireAdminSession();
  if (response || !session) return response;

  const { id } = await params;

  const { body, error } = await parseJsonBody(request);
  if (error) return error;

  const { name, email, role, password } = body as Record<string, unknown>;

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return apiError('NOT_FOUND', 'User not found.', 404);

  if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
    return apiError('BAD_REQUEST', 'name must be a non-empty string.', 400);
  }
  if (email !== undefined && !isValidEmail(email)) {
    return apiError('BAD_REQUEST', 'email must be a valid address.', 400);
  }

  if (role !== undefined) {
    if (!isUserRole(role)) {
      return apiError('BAD_REQUEST', 'role must be a valid user role.', 400);
    }
    if (isPrivilegedRole(role) && session.user.role !== 'admin') {
      return apiError('FORBIDDEN', 'Only admins can assign privileged roles.', 403);
    }
    // Demoting the last admin locks everyone out of the admin area.
    if (existing.role === 'admin' && role !== 'admin') {
      const admins = await prisma.user.count({ where: { role: 'admin' } });
      if (admins <= 1) {
        return apiError('CONFLICT', 'Cannot demote the last admin.', 409);
      }
    }
  }

  let hashedPassword: string | undefined;
  if (password !== undefined) {
    const passwordCheck = checkPassword(password);
    if (!passwordCheck.valid) {
      return apiError('BAD_REQUEST', passwordCheck.message, 400);
    }
    const { hash } = await import('bcryptjs');
    hashedPassword = await hash(password as string, PASSWORD_HASH_ROUNDS);
  }

  try {
    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(typeof name === 'string' && { name: name.trim() }),
        ...(typeof email === 'string' && { email: email.trim() }),
        ...(role !== undefined && isUserRole(role) && { role }),
        ...(hashedPassword !== undefined && { password: hashedPassword }),
      },
      select: { ...USER_SELECT },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (caught) {
    if (isUniqueConstraintError(caught)) {
      return apiError('CONFLICT', 'Email already in use.', 409);
    }
    throw caught;
  }
}

// DELETE /api/admin/users/[id]
export async function DELETE(_req: Request, { params }: Params) {
  const { session, response } = await requireAdminSession();
  if (response || !session) return response;

  const { id } = await params;
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return apiError('NOT_FOUND', 'User not found.', 404);

  // Deleting your own account logs you out of an area you may be the only one
  // able to reach.
  if (existing.id === session.user.id) {
    return apiError('BAD_REQUEST', 'You cannot delete your own account.', 400);
  }

  if (existing.role === 'admin') {
    const admins = await prisma.user.count({ where: { role: 'admin' } });
    if (admins <= 1) {
      return apiError('CONFLICT', 'Cannot delete the last admin.', 409);
    }
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
