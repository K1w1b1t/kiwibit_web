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
import { isHttpUrl } from '@/shared/lib/url';
import { isForeignKeyError, isUniqueConstraintError } from '@/shared/lib/prisma-errors';
import { isValidEmail } from '@/shared/lib/email';
import { checkPassword, PASSWORD_HASH_ROUNDS } from '@/shared/lib/password';
import { isPrivilegedRole, isUserRole } from '@/shared/lib/roles';
import type { UserRole } from '@prisma/client';

// GET /api/admin/members
export async function GET(request: Request) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { page, limit, search } = parsePaginationParams(request);
  const where: Record<string, unknown> = search
    ? { name: { contains: search, mode: 'insensitive' } }
    : {};
  return runPaginatedQuery(prisma.member as unknown as PaginatableDelegate, where, page, limit);
}

// POST /api/admin/members
export async function POST(request: Request) {
  // Previously unguarded: the route relied only on the proxy matcher, so any
  // change to it — or any internal caller — bypassed auth entirely.
  const { session, response } = await requireAdminSession();
  if (response || !session) return response;

  const { body, error } = await parseJsonBody(request);
  if (error) return error;

  const { userId, name, bio, avatarUrl, avatarPath, account } = body as Record<string, unknown>;

  if (typeof name !== 'string' || name.trim() === '') {
    return apiError('BAD_REQUEST', 'name is required.', 400);
  }
  if (userId !== undefined && typeof userId !== 'string') {
    return apiError('BAD_REQUEST', 'userId must be a string.', 400);
  }
  // Validated server-side too: a client-only URL check is not a check.
  if (typeof avatarUrl === 'string' && avatarUrl !== '' && !isHttpUrl(avatarUrl)) {
    return apiError('BAD_REQUEST', 'avatarUrl must be an http(s) URL.', 400);
  }

  // Optionally create the member's system account in the same request. Left
  // optional on purpose: `Member.userId` is nullable, so a public team member
  // does not have to be able to sign in.
  let accountData: { email: string; password: string; role: UserRole } | null = null;
  if (account !== undefined && account !== null) {
    if (typeof account !== 'object') {
      return apiError('BAD_REQUEST', 'account must be an object.', 400);
    }
    if (typeof userId === 'string') {
      return apiError('BAD_REQUEST', 'Provide either userId or account, not both.', 400);
    }

    const { email, password, role } = account as Record<string, unknown>;

    if (!isValidEmail(email)) {
      return apiError('BAD_REQUEST', 'account.email must be a valid address.', 400);
    }
    const passwordCheck = checkPassword(password);
    if (!passwordCheck.valid) {
      return apiError('BAD_REQUEST', `account.${passwordCheck.message}`, 400);
    }
    const requestedRole = role === undefined ? 'member' : role;
    if (!isUserRole(requestedRole)) {
      return apiError('BAD_REQUEST', 'account.role must be a valid user role.', 400);
    }
    if (isPrivilegedRole(requestedRole) && session.user.role !== 'admin') {
      return apiError('FORBIDDEN', 'Only admins can assign privileged roles.', 403);
    }

    accountData = {
      email: (email as string).trim(),
      password: password as string,
      role: requestedRole,
    };
  }

  try {
    const memberData = {
      ...(typeof userId === 'string' && { userId }),
      name: name.trim(),
      ...(typeof bio === 'string' && { bio }),
      ...(typeof avatarUrl === 'string' && { avatarUrl }),
      ...(typeof avatarPath === 'string' && { avatarPath }),
    };

    if (!accountData) {
      const member = await prisma.member.create({ data: memberData });
      return NextResponse.json({ success: true, data: member }, { status: 201 });
    }

    const { hash } = await import('bcryptjs');
    const hashedPassword = await hash(accountData.password, PASSWORD_HASH_ROUNDS);

    // Atomic: a member with a half-created account would be worse than an error.
    const member = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: memberData.name,
          email: accountData.email,
          password: hashedPassword,
          role: accountData.role,
        },
        select: { id: true },
      });

      return tx.member.create({
        data: { ...memberData, userId: user.id },
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
      });
    });

    return NextResponse.json({ success: true, data: member }, { status: 201 });
  } catch (caught) {
    // A non-existent userId raises a FK error; a used one violates the unique
    // index. Both used to surface as a 500.
    if (isForeignKeyError(caught)) {
      return apiError('BAD_REQUEST', 'userId does not reference an existing user.', 400);
    }
    if (isUniqueConstraintError(caught)) {
      return apiError('CONFLICT', 'This user is already linked to a member.', 409);
    }
    throw caught;
  }
}
