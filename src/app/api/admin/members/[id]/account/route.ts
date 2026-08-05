import { NextResponse } from 'next/server';
import { prisma } from '@/shared/lib/prisma';
import { requireAdminSession, apiError, parseJsonBody } from '@/shared/lib/api-helpers';
import { isValidEmail } from '@/shared/lib/email';
import { checkPassword, PASSWORD_HASH_ROUNDS } from '@/shared/lib/password';
import { isPrivilegedRole, isUserRole } from '@/shared/lib/roles';
import { isUniqueConstraintError } from '@/shared/lib/prisma-errors';

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/members/[id]/account
 *
 * Creates a system account for an existing member and links it, atomically.
 *
 * A sub-route rather than a field on `PUT /api/admin/members/[id]`: that handler
 * is a field patcher, and folding a User-creating transaction plus its own
 * 403/409 taxonomy into it would mix two responsibilities (AGENTS.md § 7).
 */
export async function POST(request: Request, { params }: Params) {
  const { session, response } = await requireAdminSession();
  if (response || !session) return response;

  const { id } = await params;

  const { body, error } = await parseJsonBody(request);
  if (error) return error;

  const { email, password, role } = body as Record<string, unknown>;

  const member = await prisma.member.findUnique({
    where: { id },
    select: { id: true, name: true, userId: true },
  });
  if (!member) return apiError('NOT_FOUND', 'Member not found.', 404);

  // The relation is 1:1 — `Member.userId` is unique.
  if (member.userId) {
    return apiError('CONFLICT', 'This member already has an account.', 409);
  }

  if (!isValidEmail(email)) {
    return apiError('BAD_REQUEST', 'email must be a valid address.', 400);
  }

  const passwordCheck = checkPassword(password);
  if (!passwordCheck.valid) {
    return apiError('BAD_REQUEST', passwordCheck.message, 400);
  }

  const requestedRole = role === undefined ? 'member' : role;
  if (!isUserRole(requestedRole)) {
    return apiError('BAD_REQUEST', 'role must be a valid user role.', 400);
  }
  if (isPrivilegedRole(requestedRole) && session.user.role !== 'admin') {
    return apiError('FORBIDDEN', 'Only admins can assign privileged roles.', 403);
  }

  const normalizedEmail = (email as string).trim();
  const { hash } = await import('bcryptjs');
  const hashedPassword = await hash(password as string, PASSWORD_HASH_ROUNDS);

  try {
    // Both writes or neither: a user without its link would be an orphan account
    // that nobody can find from the members screen.
    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: member.name,
          email: normalizedEmail,
          password: hashedPassword,
          role: requestedRole,
        },
        select: { id: true, name: true, email: true, role: true },
      });

      await tx.member.update({ where: { id }, data: { userId: user.id } });

      return user;
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (caught) {
    if (isUniqueConstraintError(caught)) {
      return apiError('CONFLICT', 'Email already in use.', 409);
    }
    throw caught;
  }
}
