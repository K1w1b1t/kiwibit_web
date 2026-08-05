import { isHttpUrl } from '@/shared/lib/url';

describe('isHttpUrl', () => {
  it.each(['http://a.co', 'https://a.co/x.png', 'https://sub.a.co:8443/p?q=1'])(
    'aceita %s',
    (value) => {
      expect(isHttpUrl(value)).toBe(true);
    },
  );

  it.each([
    '',
    '   ',
    '/relative.png',
    'a.co',
    'ftp://a.co',
    'javascript:alert(1)',
    'data:image/svg+xml;base64,AAAA',
  ])('rejeita %s', (value) => {
    expect(isHttpUrl(value)).toBe(false);
  });

  it('rejeita tipos que não são string', () => {
    expect(isHttpUrl(undefined)).toBe(false);
    expect(isHttpUrl(null)).toBe(false);
    expect(isHttpUrl(1)).toBe(false);
  });

  it('ignora espaços nas pontas', () => {
    expect(isHttpUrl('  https://a.co  ')).toBe(true);
  });
});
