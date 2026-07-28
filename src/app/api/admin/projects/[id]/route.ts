import { NextResponse } from 'next/server';
import { prisma } from '@/shared/lib/prisma';
import { requireAdminSession, apiError, parseJsonBody } from '@/shared/lib/api-helpers';
import { isHttpUrl } from '@/shared/lib/url';
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

  const { title, description, repoUrl, liveUrl } = body as Record<string, unknown>;

  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) return apiError('NOT_FOUND', 'Project not found.', 404);

  if (title !== undefined && (typeof title !== 'string' || title.trim() === ''))
    return apiError('BAD_REQUEST', 'title must be a non-empty string.', 400);
  if (description !== undefined && (typeof description !== 'string' || description.trim() === ''))
    return apiError('BAD_REQUEST', 'description must be a non-empty string.', 400);
  for (const [field, value] of [
    ['repoUrl', repoUrl],
    ['liveUrl', liveUrl],
  ] as const) {
    if (typeof value === 'string' && value !== '' && !isHttpUrl(value)) {
      return apiError('BAD_REQUEST', `${field} must be an http(s) URL.`, 400);
    }
  }

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
