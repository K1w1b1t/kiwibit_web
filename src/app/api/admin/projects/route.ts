import { parseProjectInput } from '@/entities/project/model/project-input';
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
        OR: ['title', 'description', 'titlePt', 'titleEn', 'descriptionPt', 'descriptionEn'].map(
          (field) => ({ [field]: { contains: search, mode: 'insensitive' } }),
        ),
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

  const translated = parseProjectInput(body);
  if (!translated.data) return apiError('BAD_REQUEST', translated.error, 400);
  const project = await prisma.project.create({
    data: {
      ...translated.data,
    },
  });

  return NextResponse.json({ success: true, data: project }, { status: 201 });
}
