import MarkdownIt from 'markdown-it';

const parser = new MarkdownIt({ html: true, breaks: true, linkify: false });
export function markdownToHtml(value: string): string {
  return parser.render(value);
}
