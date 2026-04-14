import { NextResponse } from 'next/server';
import { prisma } from '@/shared/lib/prisma';
import {
  requireAdminSession,
  apiError,
  parsePaginationParams,
  parseJsonBody,
  runPaginatedQuery,
  PaginatableDelegate,
} from '@/shared/lib/api-helpers';

// GET /api/admin/projects
export async function GET(request: Request) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { page, limit, search } = parsePaginationParams(request);
  const where: Record<string, unknown> = search
    ? {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }
    : {};
  return runPaginatedQuery(prisma.project as unknown as PaginatableDelegate, where, page, limit);
}

// POST /api/admin/projects
export async function POST(request: Request) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { body, error } = await parseJsonBody(request);
  if (error) return error;

  const { title, description, repoUrl, liveUrl } = body as Record<string, unknown>;

  if (typeof title !== 'string' || title.trim() === '')
    return apiError('BAD_REQUEST', 'title is required.', 400);
  if (typeof description !== 'string' || description.trim() === '')
    return apiError('BAD_REQUEST', 'description is required.', 400);

  const project = await prisma.project.create({
    data: {
      title,
      description,
      ...(typeof repoUrl === 'string' && { repoUrl }),
      ...(typeof liveUrl === 'string' && { liveUrl }),
    },
  });

  return NextResponse.json({ success: true, data: project }, { status: 201 });
}
