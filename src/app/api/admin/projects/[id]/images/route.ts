import { NextResponse } from 'next/server';
import { prisma } from '@/shared/lib/prisma';
import { requireAdminSession, apiError, parseJsonBody } from '@/shared/lib/api-helpers';
import { isHttpUrl } from '@/shared/lib/url';

type Params = { params: Promise<{ id: string }> };

/** Bounded on purpose: a carousel is not a media library, and the reorder writes every row. */
export const MAX_PROJECT_IMAGES = 24;

const IMAGE_ORDER = [{ position: 'asc' as const }, { createdAt: 'asc' as const }];

// GET /api/admin/projects/[id]/images
export async function GET(_req: Request, { params }: Params) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { id } = await params;

  const project = await prisma.project.findUnique({ where: { id }, select: { id: true } });
  if (!project) return apiError('NOT_FOUND', 'Project not found.', 404);

  const images = await prisma.projectImage.findMany({
    where: { projectId: id },
    orderBy: IMAGE_ORDER,
  });

  return NextResponse.json({ items: images, total: images.length });
}

// POST /api/admin/projects/[id]/images
export async function POST(request: Request, { params }: Params) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { id } = await params;

  const { body, error } = await parseJsonBody(request);
  if (error) return error;

  const { url, storagePath, alt } = body as Record<string, unknown>;

  if (!isHttpUrl(url)) {
    return apiError('BAD_REQUEST', 'url must be an http(s) URL.', 400);
  }
  if (typeof storagePath !== 'string') {
    return apiError('BAD_REQUEST', 'storagePath is required.', 400);
  }
  if (alt !== undefined && alt !== null && typeof alt !== 'string') {
    return apiError('BAD_REQUEST', 'alt must be a string.', 400);
  }

  const project = await prisma.project.findUnique({ where: { id }, select: { id: true } });
  if (!project) return apiError('NOT_FOUND', 'Project not found.', 404);

  const existing = await prisma.projectImage.count({ where: { projectId: id } });
  if (existing >= MAX_PROJECT_IMAGES) {
    return apiError('CONFLICT', `A project can hold at most ${MAX_PROJECT_IMAGES} images.`, 409);
  }

  const image = await prisma.projectImage.create({
    data: {
      projectId: id,
      url: (url as string).trim(),
      storagePath,
      alt: typeof alt === 'string' && alt.trim() !== '' ? alt.trim() : null,
      // Appended at the end; positions are dense so the count is the next index.
      position: existing,
      // The first image of a project is its cover, otherwise a project would
      // have images but nothing to show as the cover.
      isCover: existing === 0,
    },
  });

  return NextResponse.json({ success: true, data: image }, { status: 201 });
}
