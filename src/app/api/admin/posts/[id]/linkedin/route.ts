import { NextResponse } from 'next/server';
import { apiError, parseJsonBody, requireAdminSession } from '@/shared/lib/api-helpers';
import {
  getLinkedInReview,
  saveLinkedInReview,
  confirmLinkedInReview,
} from '@/features/admin/posts/model/linkedin-publication';

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { session, response } = await requireAdminSession();
  if (response || !session) return response;
  const { id } = await params;
  const review = await getLinkedInReview(id);
  return review
    ? NextResponse.json(review)
    : apiError('NOT_FOUND', 'Post publicado não encontrado.', 404);
}

export async function PUT(request: Request, { params }: Context) {
  const { session, response } = await requireAdminSession();
  if (response || !session) return response;
  const { id } = await params;
  const { body, error } = await parseJsonBody(request);
  if (error) return error;
  const input = body as Record<string, unknown> | null;
  if (
    !input ||
    typeof input.text !== 'string' ||
    typeof input.hashtags !== 'string' ||
    typeof input.postUpdatedAt !== 'string' ||
    typeof input.version !== 'number' ||
    !Number.isSafeInteger(input.version) ||
    input.version < 0 ||
    input.text.length > 10000 ||
    input.hashtags.length > 10000
  ) {
    return apiError('BAD_REQUEST', 'Revisão inválida.', 400);
  }
  const result = await saveLinkedInReview(
    id,
    input.version,
    input.text,
    input.hashtags,
    input.postUpdatedAt,
  );
  if ('error' in result && result.error)
    return apiError('LINKEDIN_REVIEW_INVALID', result.error, result.status);
  return NextResponse.json(result);
}

export async function POST(request: Request, { params }: Context) {
  const { session, response } = await requireAdminSession();
  if (response || !session) return response;
  const { id } = await params;
  const { body, error } = await parseJsonBody(request);
  if (error) return error;
  const input = body as Record<string, unknown> | null;
  if (
    !input ||
    typeof input.version !== 'number' ||
    !Number.isSafeInteger(input.version) ||
    input.version < 1 ||
    input.acknowledged !== true
  ) {
    return apiError('BAD_REQUEST', 'Confirmação inválida.', 400);
  }
  const result = await confirmLinkedInReview(id, input.version, true);
  if ('error' in result && result.error)
    return apiError('LINKEDIN_REVIEW_INVALID', result.error, result.status);
  return NextResponse.json(result);
}
