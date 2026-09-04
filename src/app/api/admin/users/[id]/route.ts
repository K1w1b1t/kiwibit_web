import { NextResponse } from 'next/server';
import { prisma } from '@/shared/lib/prisma';
import {
  requireAdminSession,
  requirePanelSession,
  apiError,
  parseJsonBody,
  failureResponse,
  valid,
  type Validated,
} from '@/shared/lib/api-helpers';
import {
  validateUpdateUserFields,
  validateUserPassword,
} from '@/features/admin/users/model/validate-user-body';
import { PASSWORD_HASH_ROUNDS } from '@/shared/lib/password';
import { isUniqueConstraintError } from '@/shared/lib/prisma-errors';

type Params = { params: Promise<{ id: string }> };

/** Demoting or deleting the last admin locks everyone out of the admin area. */
async function isLastAdmin() {
  return (await prisma.user.count({ where: { role: 'admin' } })) <= 1;
}

/**
 * An absent password means "keep the current one". Kept in the route rather than
 * the model layer so `bcryptjs` never becomes reachable from a client bundle.
 */
async function hashPasswordIfPresent(password: unknown): Promise<Validated<string | undefined>> {
  if (password === undefined) return valid(undefined);

  const checked = validateUserPassword(password);
  if (checked.failure) return checked;

  const { hash } = await import('bcryptjs');
  return valid(await hash(checked.data, PASSWORD_HASH_ROUNDS));
}

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
  const { session, response } = await requirePanelSession();
  if (response || !session) return response;

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { ...USER_SELECT },
  });

  if (!user) return apiError('NOT_FOUND', 'User not found.', 404);
  if (session.user.role === 'member' && session.user.id !== user.id) {
    return apiError('FORBIDDEN', 'Insufficient permissions.', 403);
  }
  return NextResponse.json(user);
}

// PUT /api/admin/users/[id]
export async function PUT(request: Request, { params }: Params) {
  const { session, response } = await requirePanelSession();
  if (response || !session) return response;

  const { id } = await params;

  const { body, error } = await parseJsonBody(request);
  if (error) return error;

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return apiError('NOT_FOUND', 'User not found.', 404);
  if (session.user.role === 'member' && session.user.id !== existing.id) {
    return apiError('FORBIDDEN', 'Insufficient permissions.', 403);
  }

  const fields = validateUpdateUserFields(body, session.user.role);
  if (fields.failure) return failureResponse(fields.failure);

  const demotesAnAdmin =
    existing.role === 'admin' && fields.data.role !== undefined && fields.data.role !== 'admin';
  if (demotesAnAdmin && (await isLastAdmin())) {
    return apiError('CONFLICT', 'Cannot demote the last admin.', 409);
  }

  const hashed = await hashPasswordIfPresent((body as Record<string, unknown>).password);
  if (hashed.failure) return failureResponse(hashed.failure);

  try {
    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...fields.data,
        ...(hashed.data !== undefined && { password: hashed.data }),
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

  if (existing.role === 'admin' && (await isLastAdmin())) {
    return apiError('CONFLICT', 'Cannot delete the last admin.', 409);
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
