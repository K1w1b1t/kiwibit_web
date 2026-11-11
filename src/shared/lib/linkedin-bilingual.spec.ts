import { composeLinkedInBlogPost, type LinkedInBlogPost } from './linkedin';

const post: LinkedInBlogPost = {
  id: 'xss',
  title: 'Legacy',
  content: 'Legacy body',
  status: 'published',
  coverImageUrl: null,
  titlePt: 'Segurança XSS',
  contentPt: 'Proteja seu site.',
  titleEn: 'XSS security',
  contentEn: 'Protect your website.',
};
const compose = (value: LinkedInBlogPost) =>
  composeLinkedInBlogPost(value, 'https://www.kiwibit.com.br')!;

describe('bilingual LinkedIn announcement', () => {
  it('includes distinct translations and URLs', () => {
    const text = compose(post).commentary!;
    expect(text).toMatch(/^English below ↓/);
    expect(text).toContain('Proteja seu site.');
    expect(text).toContain('Protect your website.');
    expect(text).toContain('/pt/blog/xss');
    expect(text).toContain('/en/blog/xss');
  });
  it.each(['pt', 'en'])('includes only the available %s translation', (locale) => {
    const value =
      locale === 'pt'
        ? { ...post, titleEn: null, contentEn: null }
        : { ...post, titlePt: null, contentPt: null };
    const text = compose(value).commentary!;
    expect(text).not.toContain('English below');
    expect(text).toContain(`/${locale}/blog/xss`);
    expect(text).not.toContain(locale === 'pt' ? '/en/' : '/pt/');
  });
  it('supports legacy articles', () => {
    expect(
      compose({
        ...post,
        titlePt: undefined,
        contentPt: undefined,
        titleEn: undefined,
        contentEn: undefined,
      }).commentary,
    ).toContain('Legacy body');
  });
  it.each(['html', 'markdown'] as const)('extracts readable %s', (contentFormat) => {
    const contentPt =
      contentFormat === 'html'
        ? '<p><strong>Seguro</strong> &amp; simples</p>'
        : '**Seguro** e simples';
    const text = compose({ ...post, contentFormat, contentPt }).commentary!;
    expect(text).toContain('Seguro');
    expect(text).not.toContain('<p>');
    expect(text).not.toContain('**');
  });
  it('preserves titles and links under the escaped budget', () => {
    const text = compose({
      ...post,
      contentPt: '*'.repeat(4000),
      contentEn: '😀'.repeat(4000),
    }).commentary!;
    expect(text.replace(/[\\|{}@[\]()<>#*_~]/g, String.raw`\$&`).length).toBeLessThanOrEqual(1500);
    expect(text).toContain(post.titleEn);
    expect(text).toContain('/en/blog/xss');
  });
});
