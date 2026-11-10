import { POST } from './route';
import { mockAuth, makeReq } from '@/shared/test-utils/spec-helpers';
import { renderPostContent } from '@/shared/lib/sanitize-rich-text';

describe('Markdown preview', () => {
  it('requires authentication', async () => {
    mockAuth(false);
    expect(
      (await POST(makeReq('http://localhost/api/admin/posts/preview', { content: 'hello' })))
        .status,
    ).toBe(401);
  });
  it('uses the same sanitized rendering as the public article', async () => {
    mockAuth();
    const content = '# Heading\n\n**Bold text** <u>underlined</u><script>alert(1)</script>';
    const response = await POST(makeReq('http://localhost/api/admin/posts/preview', { content }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.html).toBe(renderPostContent(content, 'markdown'));
    expect(body.html).toContain('<strong>Bold text</strong>');
    expect(body.html).not.toContain('<script>');
  });
});
