import { checkPassword, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@/shared/lib/password';

describe('checkPassword', () => {
  it('aceita senha no tamanho mínimo', () => {
    expect(checkPassword('a'.repeat(PASSWORD_MIN_LENGTH))).toEqual({ valid: true });
  });

  it('rejeita string vazia — o bug que gravava hash de senha vazia', () => {
    const result = checkPassword('');
    expect(result.valid).toBe(false);
  });

  it('rejeita abaixo do mínimo', () => {
    expect(checkPassword('a'.repeat(PASSWORD_MIN_LENGTH - 1)).valid).toBe(false);
  });

  it('rejeita acima do máximo de bytes do bcrypt', () => {
    expect(checkPassword('a'.repeat(PASSWORD_MAX_LENGTH + 1)).valid).toBe(false);
  });

  it('conta bytes, não caracteres, no limite do bcrypt', () => {
    // 'é' são 2 bytes em UTF-8, então 36 delas já estouram 72 bytes por 0.
    expect(checkPassword('é'.repeat(36)).valid).toBe(true);
    expect(checkPassword('é'.repeat(37)).valid).toBe(false);
  });

  it('rejeita tipos que não são string', () => {
    expect(checkPassword(undefined).valid).toBe(false);
    expect(checkPassword(null).valid).toBe(false);
    expect(checkPassword(12345678).valid).toBe(false);
  });
});
