import { NextResponse } from 'next/server';
import { prisma } from '@/shared/lib/prisma';
import { requireAdminSession, apiError } from '@/shared/lib/api-helpers';

// GET /api/admin/members
export async function GET(request: Request) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 20)));
  const search = searchParams.get('search') ?? undefined;

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

  return NextResponse.json({ items, page, limit, total });
}

// POST /api/admin/members
export async function POST(request: Request) {
  const { response } = await requireAdminSession();
  if (response) return response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON body.', 400);
  }

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
