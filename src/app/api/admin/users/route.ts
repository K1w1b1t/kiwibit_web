import { NextResponse } from 'next/server';
import { prisma } from '@/shared/lib/prisma';
import { requireAdminSession, apiError } from '@/shared/lib/api-helpers';

// GET /api/admin/users
export async function GET(request: Request) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 20)));
  const search = searchParams.get('search') ?? undefined;

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true },
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({ items, page, limit, total });
}

// POST /api/admin/users
export async function POST(request: Request) {
  const { response } = await requireAdminSession();
  if (response) return response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON body.', 400);
  }

  const { name, email, password, role } = body as Record<string, unknown>;

  if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
    return apiError('BAD_REQUEST', 'name, email and password are required strings.', 400);
  }

  const { hash } = await import('bcryptjs');
  const hashedPassword = await hash(password, 12);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return apiError('CONFLICT', 'Email already in use.', 409);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: (role as import('@prisma/client').UserRole) ?? 'member',
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json({ success: true, data: user }, { status: 201 });
}
