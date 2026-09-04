import { isAllowedSocialUrl, isHttpUrl } from '@/shared/lib/url';

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

  describe('isAllowedSocialUrl', () => {
    it.each(['https://github.com/user', 'https://www.github.com/user'])(
      'accepts GitHub host %s',
      (value) => {
        expect(isAllowedSocialUrl(value, 'github')).toBe(true);
      },
    );

    it.each(['https://linkedin.com/in/user', 'https://www.linkedin.com/in/user'])(
      'accepts LinkedIn host %s',
      (value) => {
        expect(isAllowedSocialUrl(value, 'linkedin')).toBe(true);
      },
    );

    it.each([
      ['https://example.com/user', 'github'],
      ['https://github.com.evil.example/user', 'github'],
      ['https://github.com/user', 'linkedin'],
    ] as const)('rejects non-official social host %s', (value, social) => {
      expect(isAllowedSocialUrl(value, social)).toBe(false);
    });
  });

  it('ignora espaços nas pontas', () => {
    expect(isHttpUrl('  https://a.co  ')).toBe(true);
  });
});
