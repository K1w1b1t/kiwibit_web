import { NextResponse } from 'next/server';
import { requirePanelSession, apiError, parseJsonBody } from '@/shared/lib/api-helpers';
import { renderPostContent } from '@/shared/lib/sanitize-rich-text';

export async function POST(request: Request) {
  const { response } = await requirePanelSession();
  if (response) return response;
  const { body, error } = await parseJsonBody(request);
  if (error) return error;
  const content = (body as Record<string, unknown>).content;
  if (typeof content !== 'string' || content.length > 500000)
    return apiError('BAD_REQUEST', 'Invalid content.', 400);
  return NextResponse.json({ html: renderPostContent(content, 'markdown') });
}
