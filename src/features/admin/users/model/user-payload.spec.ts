import { toCreateUserPayload, toUpdateUserPayload } from './user-payload';

const values = {
  name: 'Alice',
  email: 'alice@kiwibit.dev',
  role: 'editor' as const,
  password: 'S3nhaForte!',
};

describe('toCreateUserPayload', () => {
  it('envia todos os campos, senha inclusa', () => {
    expect(toCreateUserPayload(values)).toEqual({
      name: 'Alice',
      email: 'alice@kiwibit.dev',
      role: 'editor',
      password: 'S3nhaForte!',
    });
  });
});

describe('toUpdateUserPayload', () => {
  it('inclui a senha quando foi preenchida', () => {
    expect(toUpdateUserPayload(values).password).toBe('S3nhaForte!');
  });

  it('omite a chave password quando vazia — o PUT rejeitaria string vazia', () => {
    const payload = toUpdateUserPayload({ ...values, password: '' });
    expect('password' in payload).toBe(false);
  });

  it('sempre envia nome, e-mail e role', () => {
    const payload = toUpdateUserPayload({ ...values, password: '' });
    expect(payload).toEqual({ name: 'Alice', email: 'alice@kiwibit.dev', role: 'editor' });
  });
});
