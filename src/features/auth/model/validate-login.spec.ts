import { validateLogin } from './validate-login';

describe('validateLogin', () => {
  it('exige email e senha preenchidos', () => {
    expect(validateLogin('', '')).toBe('Preencha email e senha.');
    expect(validateLogin('admin@kiwibit.dev', '')).toBe('Preencha email e senha.');
    expect(validateLogin('   ', 'senha')).toBe('Preencha email e senha.');
  });

  it('rejeita email sem formato válido', () => {
    expect(validateLogin('admin', 'senha')).toBe('Informe um email válido.');
    expect(validateLogin('admin@kiwibit', 'senha')).toBe('Informe um email válido.');
    expect(validateLogin('admin kiwibit@dev.com', 'senha')).toBe('Informe um email válido.');
  });

  it('retorna null para entrada válida', () => {
    expect(validateLogin('admin@kiwibit.dev', 'DevPass123!')).toBeNull();
    expect(validateLogin('  admin@kiwibit.dev  ', 'x')).toBeNull();
  });
});
