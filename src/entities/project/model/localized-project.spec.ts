import { localizeProject } from './localized-project';
import { parseProjectInput } from './project-input';

const legacy = { title: 'Original', description: 'Original description' };
const bilingual = {
  ...legacy,
  titlePt: 'Projeto',
  descriptionPt: 'Descrição em português',
  titleEn: 'Project',
  descriptionEn: 'English description',
};
describe('Project translations', () => {
  it('uses complete translations for the active locale', () => {
    expect(localizeProject(bilingual, 'pt').title).toBe('Projeto');
    expect(localizeProject(bilingual, 'en').description).toBe('English description');
  });
  it('falls back as a pair without mixing partial translations', () => {
    expect(localizeProject({ ...bilingual, descriptionEn: null }, 'en')).toMatchObject({
      title: 'Projeto',
      description: bilingual.descriptionPt,
    });
    expect(localizeProject({ ...legacy, titleEn: 'Incomplete' }, 'en')).toMatchObject(legacy);
  });
  it('preserves legacy data and image references', () => {
    const images = [{ url: '/kiwi.png' }];
    expect(localizeProject({ ...legacy, images }, 'en')).toEqual({ ...legacy, images });
  });
  it('accepts an English-only project and maintains legacy fields', () => {
    expect(
      parseProjectInput({ titleEn: 'Project', descriptionEn: 'English description' }).data,
    ).toMatchObject({ title: 'Project', description: 'English description', titlePt: null });
  });
  it('preserves omitted translations and allows clearing the other translation', () => {
    expect(parseProjectInput({ titlePt: null, descriptionPt: '' }, bilingual).data).toMatchObject({
      title: 'Project',
      titleEn: 'Project',
      titlePt: null,
    });
    expect(parseProjectInput({ isFeatured: true }, bilingual).data).toMatchObject({
      ...bilingual,
      title: bilingual.titlePt,
      description: bilingual.descriptionPt,
    });
  });
  it('supports partial legacy updates without changing English', () => {
    expect(parseProjectInput({ description: 'Updated description' }, bilingual).data).toMatchObject(
      { titlePt: 'Projeto', descriptionPt: 'Updated description', titleEn: 'Project' },
    );
  });
  it.each([
    null,
    [],
    5,
    { titleEn: 'Project' },
    { titlePt: null, descriptionPt: null, titleEn: null, descriptionEn: null },
    { titleEn: 'X', descriptionEn: 'Long description' },
    { titleEn: 'Project', descriptionEn: 'short' },
    { titleEn: 'x'.repeat(161), descriptionEn: 'Long description' },
    { titleEn: 'Project', descriptionEn: 'x'.repeat(4001) },
  ])('rejects invalid or incomplete input: %p', (raw) => {
    expect(parseProjectInput(raw).error).toBeTruthy();
  });
  it.each([
    { isFeatured: 'yes' },
    { featuredOrder: 0 },
    { featuredOrder: 1.5 },
    { featuredOrder: 2147483648 },
    { repoUrl: 'javascript:alert(1)' },
    { liveUrl: {} },
  ])('validates spotlight and URL boundaries: %p', (raw) => {
    expect(parseProjectInput(raw, bilingual).error).toBeTruthy();
  });
  it('cannot clear the last translation', () => {
    expect(
      parseProjectInput(
        { titlePt: '', descriptionPt: '' },
        { ...legacy, titlePt: 'Original', descriptionPt: legacy.description },
      ).error,
    ).toBeTruthy();
  });
});
