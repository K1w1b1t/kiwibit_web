import { NextResponse } from 'next/server';
import { prisma } from '@/shared/lib/prisma';
import {
  requireAdminSession,
  apiError,
  parseJsonBody,
  failureResponse,
} from '@/shared/lib/api-helpers';
import { validateUpdateProjectBody } from '@/features/admin/projects/model/validate-project-body';
import { deleteObjects } from '@/shared/lib/storage';

type Params = { params: Promise<{ id: string }> };

// GET /api/admin/projects/[id]
export async function GET(_req: Request, { params }: Params) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: { images: { orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] } },
  });
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

  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) return apiError('NOT_FOUND', 'Project not found.', 404);

  const parsed = validateUpdateProjectBody(body);
  if (parsed.failure) return failureResponse(parsed.failure);

  const updated = await prisma.project.update({ where: { id }, data: parsed.data });

  return NextResponse.json({ success: true, data: updated });
}

// DELETE /api/admin/projects/[id]
export async function DELETE(_req: Request, { params }: Params) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { id } = await params;
  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) return apiError('NOT_FOUND', 'Project not found.', 404);

  // Read the bucket keys BEFORE the delete — the image rows cascade away with
  // the project, and with them the only record of what to remove from storage.
  const images = await prisma.projectImage.findMany({
    where: { projectId: id },
    select: { storagePath: true },
  });

  await prisma.project.delete({ where: { id } });

  await deleteObjects(images.map((image) => image.storagePath));

  return NextResponse.json({ success: true });
}
