import { NextResponse } from 'next/server';
import { prisma } from '@/shared/lib/prisma';
import { requireAdminSession, apiError, parseJsonBody } from '@/shared/lib/api-helpers';

type Params = { params: Promise<{ id: string }> };

/**
 * PUT /api/admin/projects/[id]/images/order
 *
 * Body: `{ ids: string[] }` — the complete set of the project's image ids, in
 * display order. Positions are then rewritten as 0..n-1 inside one transaction.
 *
 * Rewriting every row (instead of gap-based or fractional positions) is what
 * lets us keep `position` free of a unique constraint: there is never an
 * intermediate state with duplicates visible to another transaction.
 */
export async function PUT(request: Request, { params }: Params) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { id } = await params;

  const { body, error } = await parseJsonBody(request);
  if (error) return error;

  const { ids } = body as Record<string, unknown>;

  if (!Array.isArray(ids) || ids.some((value) => typeof value !== 'string')) {
    return apiError('BAD_REQUEST', 'ids must be an array of strings.', 400);
  }

  const current = await prisma.projectImage.findMany({
    where: { projectId: id },
    select: { id: true },
  });

  if (current.length === 0) {
    return apiError('NOT_FOUND', 'This project has no images.', 404);
  }

  // The payload must be exactly the project's images: a partial list would
  // silently drop rows to position 0, and a foreign id would let one project
  // reorder another's images.
  const currentIds = new Set(current.map((image) => image.id));
  const payloadIds = new Set(ids as string[]);

  if (payloadIds.size !== ids.length) {
    return apiError('BAD_REQUEST', 'ids must not contain duplicates.', 400);
  }
  if (payloadIds.size !== currentIds.size || [...payloadIds].some((v) => !currentIds.has(v))) {
    return apiError('BAD_REQUEST', "ids must match exactly this project's images.", 400);
  }

  await prisma.$transaction(
    (ids as string[]).map((imageId, index) =>
      prisma.projectImage.update({ where: { id: imageId }, data: { position: index } }),
    ),
  );

  const images = await prisma.projectImage.findMany({
    where: { projectId: id },
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
  });

  return NextResponse.json({ success: true, data: images });
}
