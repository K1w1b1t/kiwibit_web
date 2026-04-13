import { NextResponse } from 'next/server';
import { prisma } from '@/shared/lib/prisma';

// GET /api/members
export async function GET(request: Request) {
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
