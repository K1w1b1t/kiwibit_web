import { localizePost } from './localized-post';
import { parsePostTranslations } from './post-translations';

const post = {
  title: 'Português',
  content: 'Conteúdo português',
  titlePt: 'Português',
  contentPt: 'Conteúdo português',
  titleEn: 'English',
  contentEn: 'English content',
  coverImageAltPt: 'Capa',
  coverImageAltEn: 'Cover',
};

describe('Post translations', () => {
  it('uses the active language for the article and alt', () => {
    expect(localizePost(post, 'en')).toMatchObject({
      title: 'English',
      content: 'English content',
      coverImageAlt: 'Cover',
    });
  });
  it('falls back to the complete other translation', () => {
    expect(localizePost({ ...post, titleEn: null, contentEn: null }, 'en')).toMatchObject({
      title: 'Português',
      content: 'Conteúdo português',
    });
  });
  it('accepts English-only posts', () => {
    expect(
      parsePostTranslations({ titleEn: 'English', contentEn: 'English content' }).error,
    ).toBeUndefined();
  });
  it('rejects incomplete translations', () => {
    expect(
      parsePostTranslations({
        titlePt: 'Português',
        contentPt: 'Conteúdo português',
        titleEn: 'English',
      }).error,
    ).toBeDefined();
  });
  it('does not duplicate English into Portuguese during a partial update', () => {
    const existing = {
      ...post,
      titlePt: null,
      contentPt: null,
      title: 'English',
      content: 'English content',
    };
    expect(parsePostTranslations({}, existing).data.titlePt).toBeNull();
  });
  it('prevents clearing the only translation', () => {
    expect(
      parsePostTranslations(
        { titlePt: null, contentPt: null },
        { ...post, titleEn: null, contentEn: null },
      ).error,
    ).toBeDefined();
  });
  it('preserves omitted translations and clears explicitly empty translations', () => {
    expect(parsePostTranslations({ titleEn: null, contentEn: null }, post).data).toMatchObject({
      titlePt: 'Português',
      titleEn: null,
      contentEn: null,
    });
  });
  it('keeps compatibility with legacy inputs and prefers explicit Portuguese fields', () => {
    expect(
      parsePostTranslations({ ...post, title: 'Legacy', content: 'Legacy content' }).data.title,
    ).toBe('Português');
  });
});
