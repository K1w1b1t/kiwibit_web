import { normalizePostContent } from './normalize-post-content';
import {
  richTextToText,
  sanitizeRichText,
  renderPostContent,
} from '@/shared/lib/sanitize-rich-text';

describe('rich post content', () => {
  it('escapes literal legacy tags and preserves newlines when upgrading', () => {
    const result = normalizePostContent(
      { contentFormat: 'html', contentPt: '<p>A new Portuguese article</p>' },
      {
        content: 'Legacy <script>literal</script>\nNext line',
        contentEn: 'English <b>literal</b>',
        contentFormat: 'text',
      },
    );
    expect(result.error).toBeUndefined();
    expect(result.body.contentEn).toContain('&lt;b&gt;');
    expect(result.body.content).toContain('<br');
    expect(result.body.content).not.toContain('<script>');
  });
  it('preserves omitted HTML translations and escapes plain updates', () => {
    const result = normalizePostContent(
      { contentPt: 'Updated <b>literal text</b>' },
      {
        content: '<p>Original article text</p>',
        contentEn: '<p>English article text</p>',
        contentFormat: 'html',
      },
    );
    expect(result.body.contentEn).toBe('<p>English article text</p>');
    expect(result.body.contentPt).toContain('&lt;b&gt;');
  });
  it('rejects markup-only, image-only and short content', () => {
    for (const content of [
      '<p><br></p>',
      '<img src="https://example.com/test.png">',
      '<p>short</p>',
    ]) {
      expect(normalizePostContent({ contentFormat: 'html', content }).error).toBeDefined();
    }
  });
  it('keeps text payloads unchanged and rejects unknown formats', () => {
    expect(normalizePostContent({ content: '<b>literal text</b>' }).body.content).toBe(
      '<b>literal text</b>',
    );
    expect(normalizePostContent({ contentFormat: 'unknown' }).error).toBeDefined();
  });
  it('removes executable HTML and unsafe protocols while retaining supported formatting', () => {
    const clean = sanitizeRichText(
      '<script>alert(1)</script><h2 onclick="alert(1)">Heading</h2><p style="color:red"><strong>Bold</strong><u>Underline</u> 😀</p><a href="javascript:alert(1)">bad</a><img src="data:image/png;base64,abc" onerror="alert(1)"><iframe src="https://example.com"></iframe>',
    );
    expect(clean).not.toMatch(/script|onclick|onerror|style=|javascript:|data:|iframe/);
    expect(clean).toContain('<h2>Heading</h2>');
    expect(clean).toContain('<u>Underline</u>');
    expect(richTextToText('<p>One &amp; two</p><p>Three 😀</p>')).toBe('One & two Three 😀');
  });
});

describe('Markdown posts', () => {
  it('persists Markdown and raw HTML while rendering only safe markup', () => {
    const source =
      '# Heading\n\nA **strong** paragraph with <u>underlined text</u> and <script>alert(1)</script>.';
    const result = normalizePostContent({ contentFormat: 'markdown', content: source });
    expect(result.error).toBeUndefined();
    expect(result.body.content).toBe(source);
    const rendered = renderPostContent(source, 'markdown');
    expect(rendered).toContain('<strong>strong</strong>');
    expect(rendered).toContain('<u>underlined text</u>');
    expect(rendered).not.toContain('<script>');
  });
  it('converts omitted legacy translations to safe HTML within Markdown', () => {
    const result = normalizePostContent(
      { contentFormat: 'markdown', contentPt: 'A complete translated article' },
      {
        content: 'Old <literal> content here',
        contentEn: 'Legacy <b>English</b> content',
        contentFormat: 'text',
      },
    );
    expect(result.body.contentEn).toContain('&lt;b&gt;');
    expect(result.body.content).toContain('&lt;literal&gt;');
  });
});
