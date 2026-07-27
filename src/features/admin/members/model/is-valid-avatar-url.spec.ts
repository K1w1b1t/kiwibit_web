import { isValidAvatarUrl } from './is-valid-avatar-url';

describe('isValidAvatarUrl', () => {
  it('retorna false para string vazia ou em branco', () => {
    expect(isValidAvatarUrl('')).toBe(false);
    expect(isValidAvatarUrl('   ')).toBe(false);
  });

  it('retorna false para texto que não é URL', () => {
    expect(isValidAvatarUrl('não é url')).toBe(false);
  });

  it('retorna false para protocolo não-http', () => {
    expect(isValidAvatarUrl('ftp://exemplo.com/a.png')).toBe(false);
  });

  it('retorna true para http/https válido', () => {
    expect(isValidAvatarUrl('http://exemplo.com/a.png')).toBe(true);
    expect(isValidAvatarUrl('https://exemplo.com')).toBe(true);
  });

  it('ignora espaços nas bordas', () => {
    expect(isValidAvatarUrl('  https://exemplo.com/a.png  ')).toBe(true);
  });
});
