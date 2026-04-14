import { NextResponse } from 'next/server';
import { prisma } from '@/shared/lib/prisma';
import { requireAdminSession, apiError, parseJsonBody } from '@/shared/lib/api-helpers';

type Params = { params: Promise<{ id: string }> };

// GET /api/admin/posts/[id]
export async function GET(_req: Request, { params }: Params) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { id } = await params;
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) return apiError('NOT_FOUND', 'Post not found.', 404);
  return NextResponse.json(post);
}

// PUT /api/admin/posts/[id]
export async function PUT(request: Request, { params }: Params) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { id } = await params;

  const { body, error } = await parseJsonBody(request);
  if (error) return error;

  const { title, content } = body as Record<string, unknown>;

  const existing = await prisma.post.findUnique({ where: { id } });
  if (!existing) return apiError('NOT_FOUND', 'Post not found.', 404);

  const updated = await prisma.post.update({
    where: { id },
    data: {
      ...(typeof title === 'string' && { title }),
      ...(typeof content === 'string' && { content }),
    },
  });

  return NextResponse.json({ success: true, data: updated });
}

// DELETE /api/admin/posts/[id]
export async function DELETE(_req: Request, { params }: Params) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { id } = await params;
  const existing = await prisma.post.findUnique({ where: { id } });
  if (!existing) return apiError('NOT_FOUND', 'Post not found.', 404);

  await prisma.post.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
