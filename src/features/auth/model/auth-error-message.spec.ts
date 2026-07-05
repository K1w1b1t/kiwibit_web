import { authErrorMessage } from './auth-error-message';

describe('authErrorMessage', () => {
  it('mapeia CredentialsSignin para mensagem de credenciais', () => {
    expect(authErrorMessage('CredentialsSignin')).toBe('Email ou senha incorretos.');
  });

  it('usa mensagem genérica para códigos desconhecidos', () => {
    expect(authErrorMessage('OAuthSignin')).toBe('Erro ao autenticar. Tente novamente.');
  });

  it('usa mensagem genérica para null/undefined', () => {
    expect(authErrorMessage(undefined)).toBe('Erro ao autenticar. Tente novamente.');
    expect(authErrorMessage(null)).toBe('Erro ao autenticar. Tente novamente.');
  });
});
