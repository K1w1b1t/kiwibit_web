import { NextResponse } from 'next/server';
import { prisma } from '@/shared/lib/prisma';
import { apiError } from '@/shared/lib/api-helpers';

type Params = { params: Promise<{ id: string }> };

// GET /api/posts/[id] — public
export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const post = await prisma.post.findUnique({
    where: { id },
    // Expose the author's name so the reader view never shows a raw id.
    include: { author: { select: { name: true } } },
  });
  if (!post) return apiError('NOT_FOUND', 'Post not found.', 404);
  // A draft is indistinguishable from a non-existent post to the public — a
  // distinct status would leak that the id exists.
  if (post.status !== 'published') return apiError('NOT_FOUND', 'Post not found.', 404);
  return NextResponse.json(post);
}
