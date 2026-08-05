import { NextResponse } from 'next/server';
import { prisma } from '@/shared/lib/prisma';
import {
  requireAdminSession,
  apiError,
  parseJsonBody,
  failureResponse,
} from '@/shared/lib/api-helpers';
import { validateUpdateProjectImageBody } from '@/features/admin/projects/model/validate-project-image-body';
import { deleteObjects } from '@/shared/lib/storage';

type Params = { params: Promise<{ id: string; imageId: string }> };

const IMAGE_ORDER = [{ position: 'asc' as const }, { createdAt: 'asc' as const }];

/**
 * PUT — edits `alt` and/or promotes the image to cover.
 *
 * Setting the cover is a clear-then-set pair inside one transaction. That, not a
 * FK, is what enforces "exactly one cover per project": a FK cannot express that
 * the referenced image belongs to this project.
 */
export async function PUT(request: Request, { params }: Params) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { id, imageId } = await params;

  const { body, error } = await parseJsonBody(request);
  if (error) return error;

  const parsed = validateUpdateProjectImageBody(body);
  if (parsed.failure) return failureResponse(parsed.failure);

  const { alt, isCover } = parsed.data;
  // Absent `alt` must stay absent: an explicit `alt: undefined` would still be a
  // key in the update payload.
  const altData = alt === undefined ? {} : { alt };

  const existing = await prisma.projectImage.findUnique({ where: { id: imageId } });
  // Scoping to the route's project id stops one project from editing another's.
  if (!existing || existing.projectId !== id) {
    return apiError('NOT_FOUND', 'Image not found for this project.', 404);
  }

  if (isCover === true) {
    await prisma.$transaction([
      prisma.projectImage.updateMany({
        where: { projectId: id },
        data: { isCover: false },
      }),
      prisma.projectImage.update({
        where: { id: imageId },
        data: { isCover: true, ...altData },
      }),
    ]);
  } else {
    await prisma.projectImage.update({
      where: { id: imageId },
      data: {
        ...altData,
        // Unsetting the only cover is refused implicitly: isCover=false is only
        // applied when another image is promoted.
        ...(isCover === false && !existing.isCover && { isCover: false }),
      },
    });
  }

  const images = await prisma.projectImage.findMany({
    where: { projectId: id },
    orderBy: IMAGE_ORDER,
  });

  return NextResponse.json({ success: true, data: images });
}

/**
 * DELETE — removes the row, compacts positions, promotes a new cover if needed,
 * and only then deletes the object from the bucket (best effort).
 */
export async function DELETE(_req: Request, { params }: Params) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { id, imageId } = await params;

  const existing = await prisma.projectImage.findUnique({ where: { id: imageId } });
  if (!existing || existing.projectId !== id) {
    return apiError('NOT_FOUND', 'Image not found for this project.', 404);
  }

  const remaining = await prisma.projectImage.findMany({
    where: { projectId: id, NOT: { id: imageId } },
    orderBy: IMAGE_ORDER,
    select: { id: true },
  });

  await prisma.$transaction([
    prisma.projectImage.delete({ where: { id: imageId } }),
    // Positions stay dense, so the frontend's reorder payload is always valid.
    ...remaining.map((image, index) =>
      prisma.projectImage.update({
        where: { id: image.id },
        data: {
          position: index,
          // Deleting the cover would leave the project with nothing to show.
          ...(existing.isCover && { isCover: index === 0 }),
        },
      }),
    ),
  ]);

  // DB first, object second: an orphaned object is invisible waste, while a row
  // pointing at a 404 is user-facing breakage.
  await deleteObjects([existing.storagePath]);

  const images = await prisma.projectImage.findMany({
    where: { projectId: id },
    orderBy: IMAGE_ORDER,
  });

  return NextResponse.json({ success: true, data: images });
}
