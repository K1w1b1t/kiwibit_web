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
    expect(text).toContain('Leia o post no meu blog: https://www.kiwibit.com.br/pt/blog/xss');
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
  it('preserves complete ideas beyond the previous 180-character limit', () => {
    const first = `Uma primeira ideia ${'bem desenvolvida '.repeat(13)}termina aqui.`;
    const second = 'Uma segunda frase completa também pode ser apresentada.';
    const text = compose({
      ...post,
      titleEn: null,
      contentEn: null,
      contentPt: `${first} ${second}`,
    }).commentary!;
    expect(text).toContain(first);
    expect(text).toContain(second);
  });
  it('prefers a complete sentence over a fragment of the next one', () => {
    const first = 'Uma ideia completa termina aqui.';
    const text = compose({
      ...post,
      titleEn: null,
      contentEn: null,
      contentPt: `${first} ${'Continuação muito longa '.repeat(200)}`,
    }).commentary!;
    expect(text).toContain(first);
    expect(text).not.toContain('Continuação muito longa');
  });
  it('uses the separately written introductions for each language without truncating them', () => {
    const text = compose({
      ...post,
      linkedinIntroPt: 'Chamada portuguesa completa.',
      linkedinIntroEn: 'Complete English introduction.',
    }).commentary!;
    expect(text).toContain('Chamada portuguesa completa.');
    expect(text).toContain('Complete English introduction.');
    expect(text).not.toContain('Proteja seu site.');
    expect(text).not.toContain('Protect your website.');
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
