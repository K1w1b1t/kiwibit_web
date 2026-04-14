import { NextResponse } from 'next/server';
import { prisma } from '@/shared/lib/prisma';
import { requireAdminSession, apiError, parseJsonBody } from '@/shared/lib/api-helpers';

type Params = { params: Promise<{ id: string }> };

// GET /api/admin/projects/[id]
export async function GET(_req: Request, { params }: Params) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return apiError('NOT_FOUND', 'Project not found.', 404);
  return NextResponse.json(project);
}

// PUT /api/admin/projects/[id]
export async function PUT(request: Request, { params }: Params) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { id } = await params;

  const { body, error } = await parseJsonBody(request);
  if (error) return error;

  const { title, description, repoUrl, liveUrl } = body as Record<string, unknown>;

  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) return apiError('NOT_FOUND', 'Project not found.', 404);

  const updated = await prisma.project.update({
    where: { id },
    data: {
      ...(typeof title === 'string' && { title }),
      ...(typeof description === 'string' && { description }),
      ...(repoUrl !== undefined && { repoUrl: typeof repoUrl === 'string' ? repoUrl : null }),
      ...(liveUrl !== undefined && { liveUrl: typeof liveUrl === 'string' ? liveUrl : null }),
    },
  });

  return NextResponse.json({ success: true, data: updated });
}

// DELETE /api/admin/projects/[id]
export async function DELETE(_req: Request, { params }: Params) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { id } = await params;
  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) return apiError('NOT_FOUND', 'Project not found.', 404);

  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
