/** Escape legacy text before introducing it into an HTML document. */
export function textToHtml(text: string): string {
  return `<p>${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/\r?\n/g, '<br>')}</p>`;
}

export type ContentFormat = 'text' | 'html';
