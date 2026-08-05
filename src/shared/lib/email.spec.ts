import { EMAIL_MAX_LENGTH, isValidEmail } from '@/shared/lib/email';

describe('isValidEmail', () => {
  it.each(['a@b.co', 'tech@amora.com.br', 'first.last+tag@sub.domain.org'])(
    'aceita %s',
    (value) => {
      expect(isValidEmail(value)).toBe(true);
    },
  );

  it.each(['', '   ', 'sem-arroba', 'a@b', 'a@@b.co', 'a b@c.co', 'a@b .co'])(
    'rejeita %s',
    (value) => {
      expect(isValidEmail(value)).toBe(false);
    },
  );

  it('rejeita tipos que não são string', () => {
    expect(isValidEmail(undefined)).toBe(false);
    expect(isValidEmail(null)).toBe(false);
    expect(isValidEmail(42)).toBe(false);
  });

  it('rejeita acima do tamanho máximo', () => {
    const local = 'a'.repeat(EMAIL_MAX_LENGTH);
    expect(isValidEmail(`${local}@b.co`)).toBe(false);
  });

  it('ignora espaços nas pontas', () => {
    expect(isValidEmail('  a@b.co  ')).toBe(true);
  });
});
