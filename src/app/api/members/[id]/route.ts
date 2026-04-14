import { NextResponse } from 'next/server';
import { prisma } from '@/shared/lib/prisma';
import { apiError } from '@/shared/lib/api-helpers';

type Params = { params: Promise<{ id: string }> };

// GET /api/members/[id]
export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const member = await prisma.member.findUnique({ where: { id } });
  if (!member) return apiError('NOT_FOUND', 'Member not found.', 404);
  return NextResponse.json(member);
}
