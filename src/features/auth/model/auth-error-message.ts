/** Converte o código de erro do next-auth signIn em mensagem pt-BR. */
export function authErrorMessage(error: string | null | undefined): string {
  if (error === 'CredentialsSignin') return 'Email ou senha incorretos.';
  return 'Erro ao autenticar. Tente novamente.';
}
