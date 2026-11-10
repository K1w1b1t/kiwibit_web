/** Escape legacy text before introducing it into an HTML document. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function textToHtml(text: string): string {
  return `<p>${escapeHtml(text).replace(/\r?\n/g, '<br>')}</p>`;
}

export type ContentFormat = 'text' | 'html' | 'markdown';
