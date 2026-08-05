import { MEMBER_LIMITS, validateMember } from './validate-member';

const base = { name: 'Ana', bio: '', avatarUrl: '', avatarPath: '' };

describe('validateMember', () => {
  it('aceita nome válido sem avatar', () => {
    const result = validateMember(base);
    expect(result.valid).toBe(true);
    if (result.valid)
      expect(result.data).toEqual({ name: 'Ana', bio: '', avatarUrl: '', avatarPath: '' });
  });

  it.each(['A', '  ', ''])('exige nome com pelo menos 2 caracteres: %s', (name) => {
    const result = validateMember({ ...base, name });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.fieldErrors.name).toBeTruthy();
  });

  it('rejeita nome acima do máximo', () => {
    const result = validateMember({ ...base, name: 'a'.repeat(MEMBER_LIMITS.nameMax + 1) });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.fieldErrors.name).toBeTruthy();
  });

  it('rejeita bio acima do máximo', () => {
    const result = validateMember({ ...base, bio: 'a'.repeat(MEMBER_LIMITS.bioMax + 1) });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.fieldErrors.bio).toBeTruthy();
  });

  it('rejeita avatarUrl inválida', () => {
    const result = validateMember({ ...base, avatarUrl: 'não-url' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.fieldErrors.avatarUrl).toBeTruthy();
  });

  it('aceita avatarUrl http/https válida', () => {
    const result = validateMember({ ...base, avatarUrl: 'https://x.com/a.png' });
    expect(result.valid).toBe(true);
  });

  it('normaliza espaços nas pontas', () => {
    const result = validateMember({
      name: '  Ana  ',
      bio: '  dev  ',
      avatarUrl: '  https://x.com/a.png  ',
      avatarPath: '  members/a.png  ',
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data).toEqual({
        name: 'Ana',
        bio: 'dev',
        avatarUrl: 'https://x.com/a.png',
        avatarPath: 'members/a.png',
      });
    }
  });

  it('acumula erros de campos diferentes', () => {
    const result = validateMember({ name: 'A', bio: '', avatarUrl: 'nope', avatarPath: '' });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.fieldErrors.name).toBeTruthy();
      expect(result.fieldErrors.avatarUrl).toBeTruthy();
    }
  });
});
