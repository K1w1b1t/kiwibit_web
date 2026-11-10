import { normalizePostContent } from './normalize-post-content';
import { richTextToText, sanitizeRichText } from '@/shared/lib/sanitize-rich-text';

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
