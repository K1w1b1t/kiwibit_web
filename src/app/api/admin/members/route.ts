import { NextResponse } from 'next/server';
import { prisma } from '@/shared/lib/prisma';
import {
  requireAdminSession,
  apiError,
  parsePaginationParams,
  parseJsonBody,
  paginatedJson,
} from '@/shared/lib/api-helpers';

// GET /api/admin/members
export async function GET(request: Request) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { page, limit, search } = parsePaginationParams(request);
  const where = search ? { name: { contains: search, mode: 'insensitive' as const } } : {};

  const [items, total] = await Promise.all([
    prisma.member.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.member.count({ where }),
  ]);

  return paginatedJson(items, page, limit, total);
}

// POST /api/admin/members
export async function POST(request: Request) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { body, error } = await parseJsonBody(request);
  if (error) return error;

  const { userId, name, bio, avatarUrl } = body as Record<string, unknown>;

  if (typeof name !== 'string' || name.trim() === '') {
    return apiError('BAD_REQUEST', 'name is required.', 400);
  }

  const member = await prisma.member.create({
    data: {
      ...(typeof userId === 'string' && { userId }),
      name,
      ...(typeof bio === 'string' && { bio }),
      ...(typeof avatarUrl === 'string' && { avatarUrl }),
    },
  });

  return NextResponse.json({ success: true, data: member }, { status: 201 });
}
