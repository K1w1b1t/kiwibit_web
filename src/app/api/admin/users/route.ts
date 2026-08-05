import { NextResponse } from 'next/server';
import { prisma } from '@/shared/lib/prisma';
import {
  requireAdminSession,
  apiError,
  parsePaginationParams,
  parseJsonBody,
  runPaginatedQuery,
  PaginatableDelegate,
} from '@/shared/lib/api-helpers';
import { isUserRole, isPrivilegedRole } from '@/shared/lib/roles';
import { isValidEmail } from '@/shared/lib/email';
import { checkPassword, PASSWORD_HASH_ROUNDS } from '@/shared/lib/password';
import { isUniqueConstraintError } from '@/shared/lib/prisma-errors';

/** `password` is never selected — not even to be discarded later. */
const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;

// GET /api/admin/users
export async function GET(request: Request) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { page, limit, search } = parsePaginationParams(request);
  const where: Record<string, unknown> = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }
    : {};
  return runPaginatedQuery(prisma.user as unknown as PaginatableDelegate, where, page, limit, {
    select: { ...USER_SELECT },
  });
}

// POST /api/admin/users
export async function POST(request: Request) {
  const { session, response } = await requireAdminSession();
  if (response || !session) return response;

  const { body, error } = await parseJsonBody(request);
  if (error) return error;

  const { name, email, password, role } = body as Record<string, unknown>;

  if (typeof name !== 'string' || name.trim() === '') {
    return apiError('BAD_REQUEST', 'name is required.', 400);
  }
  if (!isValidEmail(email)) {
    return apiError('BAD_REQUEST', 'email must be a valid address.', 400);
  }

  const passwordCheck = checkPassword(password);
  if (!passwordCheck.valid) {
    return apiError('BAD_REQUEST', passwordCheck.message, 400);
  }

  // Default to the least privileged role when none is given.
  const requestedRole = role === undefined ? 'member' : role;
  if (!isUserRole(requestedRole)) {
    return apiError('BAD_REQUEST', 'role must be a valid user role.', 400);
  }
  // Without this, an editor could mint another admin and escalate privileges.
  if (isPrivilegedRole(requestedRole) && session.user.role !== 'admin') {
    return apiError('FORBIDDEN', 'Only admins can assign privileged roles.', 403);
  }

  const normalizedEmail = (email as string).trim();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) return apiError('CONFLICT', 'Email already in use.', 409);

  // Hash only after the cheap checks — bcrypt at cost 12 costs ~100ms.
  const { hash } = await import('bcryptjs');
  const hashedPassword = await hash(password as string, PASSWORD_HASH_ROUNDS);

  try {
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: requestedRole,
      },
      select: { ...USER_SELECT },
    });

    return NextResponse.json({ success: true, data: user }, { status: 201 });
  } catch (caught) {
    // The findUnique above races this insert.
    if (isUniqueConstraintError(caught)) {
      return apiError('CONFLICT', 'Email already in use.', 409);
    }
    throw caught;
  }
}
