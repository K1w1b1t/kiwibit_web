import { textToHtml } from '@/shared/lib/rich-text';
import {
  richTextToText,
  sanitizeRichText,
  renderPostContent,
} from '@/shared/lib/sanitize-rich-text';

const fields = ['content', 'contentPt', 'contentEn'] as const;
type Content = {
  content: string;
  contentPt?: string | null;
  contentEn?: string | null;
  contentFormat?: 'text' | 'html' | 'markdown';
};

/** Normalize the complete merged record, preserving omitted translations. */
export function normalizePostContent(
  raw: Record<string, unknown>,
  existing?: Content,
): { body: Record<string, unknown>; error?: string } {
  if (
    raw.contentFormat !== undefined &&
    raw.contentFormat !== 'text' &&
    raw.contentFormat !== 'html' &&
    raw.contentFormat !== 'markdown'
  )
    return { body: raw, error: 'Invalid contentFormat.' };
  const format =
    raw.contentFormat === 'markdown' || existing?.contentFormat === 'markdown'
      ? 'markdown'
      : raw.contentFormat === 'html' || existing?.contentFormat === 'html'
        ? 'html'
        : 'text';
  const body = { ...raw, contentFormat: format };
  if (format === 'text') return { body };
  const source = { ...raw };
  if (raw.content !== undefined && raw.contentPt === undefined) source.contentPt = raw.content;
  for (const field of fields) {
    const supplied = source[field] !== undefined;
    const value = supplied ? source[field] : existing?.[field];
    if (value === undefined || value === null) continue;
    if (typeof value !== 'string') return { body, error: `${field} must be a string or null.` };
    const inputFormat = supplied
      ? (raw.contentFormat ?? 'text')
      : (existing?.contentFormat ?? 'text');
    const normalized =
      inputFormat === 'text'
        ? textToHtml(value)
        : inputFormat === 'html'
          ? sanitizeRichText(value)
          : value;
    const rendered = renderPostContent(normalized, format);
    if (value.trim() && richTextToText(rendered).length < 10)
      return { body, error: `${field} must contain at least 10 visible characters.` };
    Object.assign(body, { [field]: richTextToText(rendered) ? normalized : null });
  }
  return { body };
}
