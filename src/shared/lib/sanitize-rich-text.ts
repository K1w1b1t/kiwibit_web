import { markdownToHtml } from './markdown';
import sanitizeHtml from 'sanitize-html';

export function sanitizeRichText(value: string): string {
  return sanitizeHtml(value, {
    allowedTags: [
      'p',
      'br',
      'h1',
      'h2',
      'h3',
      'strong',
      'b',
      'em',
      'i',
      'u',
      'ul',
      'ol',
      'li',
      'blockquote',
      'a',
      'img',
      'pre',
      'code',
      'hr',
      's',
      'del',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
    ],
    allowedAttributes: { a: ['href', 'title', 'target', 'rel'], img: ['src', 'alt', 'title'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: { img: ['http', 'https'] },
    allowProtocolRelative: false,
    transformTags: { a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }) },
  });
}

export function richTextToText(value: string): string {
  const html = sanitizeRichText(value).replace(
    /<(?:br\s*\/?|\/p|\/h[123]|\/li|\/blockquote)>/g,
    ' ',
  );
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export function renderPostContent(value: string, format: 'text' | 'html' | 'markdown'): string {
  return sanitizeRichText(format === 'markdown' ? markdownToHtml(value) : value);
}
