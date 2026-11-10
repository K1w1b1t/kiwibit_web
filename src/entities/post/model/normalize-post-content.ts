import { textToHtml } from '@/shared/lib/rich-text';
import { richTextToText, sanitizeRichText } from '@/shared/lib/sanitize-rich-text';

const fields = ['content', 'contentPt', 'contentEn'] as const;
type Content = {
  content: string;
  contentPt?: string | null;
  contentEn?: string | null;
  contentFormat?: 'text' | 'html';
};

/** Normalize the complete merged record, preserving omitted translations. */
export function normalizePostContent(
  raw: Record<string, unknown>,
  existing?: Content,
): { body: Record<string, unknown>; error?: string } {
  if (
    raw.contentFormat !== undefined &&
    raw.contentFormat !== 'text' &&
    raw.contentFormat !== 'html'
  )
    return { body: raw, error: 'Invalid contentFormat.' };
  const html = raw.contentFormat === 'html' || existing?.contentFormat === 'html';
  const body = { ...raw, contentFormat: html ? 'html' : 'text' };
  if (!html) return { body };
  const source = { ...raw };
  if (raw.content !== undefined && raw.contentPt === undefined) source.contentPt = raw.content;
  for (const field of fields) {
    const supplied = source[field] !== undefined;
    const value = supplied ? source[field] : existing?.[field];
    if (value === undefined || value === null) continue;
    if (typeof value !== 'string') return { body, error: `${field} must be a string or null.` };
    const isHtml = supplied ? raw.contentFormat === 'html' : existing?.contentFormat === 'html';
    const normalized = sanitizeRichText(isHtml ? value : textToHtml(value));
    if (value.trim() && richTextToText(normalized).length < 10)
      return { body, error: `${field} must contain at least 10 visible characters.` };
    Object.assign(body, { [field]: richTextToText(normalized) ? normalized : null });
  }
  return { body };
}
