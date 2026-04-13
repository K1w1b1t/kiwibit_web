import { NextResponse } from 'next/server';
import { prisma } from '@/shared/lib/prisma';
import { requireAdminSession, apiError } from '@/shared/lib/api-helpers';

// GET /api/admin/projects
export async function GET(request: Request) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 20)));
  const search = searchParams.get('search') ?? undefined;

  const where = search
    ? {
        OR: [
          { title: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    prisma.project.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.project.count({ where }),
  ]);

  return NextResponse.json({ items, page, limit, total });
}

// POST /api/admin/projects
export async function POST(request: Request) {
  const { response } = await requireAdminSession();
  if (response) return response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON body.', 400);
  }

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
