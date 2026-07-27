import { validateMember } from './validate-member';

const base = { name: 'Ana', bio: '', avatarUrl: '' };

describe('validateMember', () => {
  it('exige nome com pelo menos 2 caracteres', () => {
    expect(validateMember({ ...base, name: 'A' })).toBe(
      'Nome precisa ter pelo menos 2 caracteres.',
    );
    expect(validateMember({ ...base, name: '  ' })).toBe(
      'Nome precisa ter pelo menos 2 caracteres.',
    );
  });

  it('aceita nome válido sem avatar', () => {
    expect(validateMember(base)).toBeNull();
  });

  it('rejeita avatarUrl inválida', () => {
    expect(validateMember({ ...base, avatarUrl: 'não-url' })).toBe(
      'Avatar URL deve ser uma URL http/https válida.',
    );
  });

  it('aceita avatarUrl http/https válida', () => {
    expect(validateMember({ ...base, avatarUrl: 'https://x.com/a.png' })).toBeNull();
  });
});
