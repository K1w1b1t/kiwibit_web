import { USER_NAME_MAX, validateUser } from './validate-user';

const base = {
  name: 'Alice',
  email: 'alice@kiwibit.dev',
  role: 'member',
  password: 'S3nhaForte!',
};

const create = { requirePassword: true };
const edit = { requirePassword: false };

describe('validateUser', () => {
  it('aceita dados válidos na criação', () => {
    expect(validateUser(base, create).valid).toBe(true);
  });

  it.each(['A', '', '  '])('rejeita nome curto: %s', (name) => {
    const result = validateUser({ ...base, name }, create);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.fieldErrors.name).toBeTruthy();
  });

  it('rejeita nome acima do máximo', () => {
    const result = validateUser({ ...base, name: 'a'.repeat(USER_NAME_MAX + 1) }, create);
    expect(result.valid).toBe(false);
  });

  it.each(['', 'nope', 'a@b'])('rejeita e-mail inválido: %s', (email) => {
    const result = validateUser({ ...base, email }, create);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.fieldErrors.email).toBeTruthy();
  });

  it.each(['', 'superuser', 'ADMIN'])('rejeita role fora do enum: %s', (role) => {
    const result = validateUser({ ...base, role }, create);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.fieldErrors.role).toBeTruthy();
  });

  it.each(['admin', 'editor', 'member_manager', 'member'])('aceita a role %s', (role) => {
    expect(validateUser({ ...base, role }, create).valid).toBe(true);
  });

  it('exige senha na criação', () => {
    const result = validateUser({ ...base, password: '' }, create);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.fieldErrors.password).toBeTruthy();
  });

  it('senha vazia na edição significa "não mudar"', () => {
    expect(validateUser({ ...base, password: '' }, edit).valid).toBe(true);
  });

  it('valida senha preenchida também na edição', () => {
    const result = validateUser({ ...base, password: 'curta' }, edit);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.fieldErrors.password).toBeTruthy();
  });

  it('normaliza espaços de nome e e-mail', () => {
    const result = validateUser({ ...base, name: '  Alice  ', email: '  a@b.co  ' }, create);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.name).toBe('Alice');
      expect(result.data.email).toBe('a@b.co');
    }
  });
});
