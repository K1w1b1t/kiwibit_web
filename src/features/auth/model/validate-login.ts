const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

/**
 * Validação client-side do form de login (substitui os balões nativos do
 * navegador, que destoam do visual). Retorna a mensagem de erro ou null.
 */
export function validateLogin(email: string, password: string): string | null {
  if (!email.trim() || !password) return 'Preencha email e senha.';
  if (!EMAIL_PATTERN.test(email.trim())) return 'Informe um email válido.';
  return null;
}
