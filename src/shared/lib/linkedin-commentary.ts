/** Escape literal little-text characters while retaining actual hashtag elements. */
export function escapeLinkedInCommentary(text: string): string {
  const escape = (value: string) => value.replace(/[\\|{}@[\]()<>#*_~]/g, String.raw`\$&`);
  let result = '';
  let offset = 0;
  for (const match of text.matchAll(/#[\p{L}\p{N}_]+/gu)) {
    const index = match.index;
    result += escape(text.slice(offset, index)) + match[0];
    offset = index + match[0].length;
  }
  return result + escape(text.slice(offset));
}
