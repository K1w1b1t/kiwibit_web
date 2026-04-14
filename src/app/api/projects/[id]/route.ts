import { NextResponse } from 'next/server';
import { prisma } from '@/shared/lib/prisma';
import { apiError } from '@/shared/lib/api-helpers';

type Params = { params: Promise<{ id: string }> };

// GET /api/projects/[id]
export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return apiError('NOT_FOUND', 'Project not found.', 404);
  return NextResponse.json(project);
}
