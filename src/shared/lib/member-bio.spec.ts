import { getMemberBio } from './member-bio';

const enLabels = { noBio: 'Coming soon' };
const ptLabels = { noBio: 'Em breve' };

describe('getMemberBio', () => {
  it.each([
    [{ bioPt: 'Bio em português', bioEn: 'English bio' }, 'en', enLabels, 'English bio'],
    [{ bioPt: 'Bio em português', bioEn: 'English bio' }, 'pt', ptLabels, 'Bio em português'],
    [{ bioPt: null, bioEn: null }, 'en', enLabels, 'Coming soon'],
    [{ bioPt: null, bioEn: null }, 'pt', ptLabels, 'Em breve'],
    [{ bioPt: '   ', bioEn: 'English bio' }, 'pt', ptLabels, 'Em breve'],
    [{ bioPt: 'Bio em português', bioEn: '' }, 'en', enLabels, 'Coming soon'],
    [{ bioPt: '  ', bioEn: '  ' }, 'en', enLabels, 'Coming soon'],
  ] as const)('returns the expected text for %o in %s', (member, locale, labels, expected) => {
    expect(getMemberBio(member, locale, labels)).toBe(expected);
  });
});
