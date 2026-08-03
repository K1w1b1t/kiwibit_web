import { NextResponse } from 'next/server';
import { prisma } from '@/shared/lib/prisma';
import {
  requireAdminSession,
  apiError,
  parsePaginationParams,
  parseJsonBody,
  runPaginatedQuery,
  failureResponse,
  PaginatableDelegate,
} from '@/shared/lib/api-helpers';
import { validateCreateMemberBody } from '@/features/admin/members/model/validate-member-body';
import { isForeignKeyError, isUniqueConstraintError } from '@/shared/lib/prisma-errors';
import { PASSWORD_HASH_ROUNDS } from '@/shared/lib/password';

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

  const parsed = validateCreateMemberBody(body, session.user.role);
  if (parsed.failure) return failureResponse(parsed.failure);

  const { member: memberData, account: accountData } = parsed.data;

  try {
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
