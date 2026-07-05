import { isValidAvatarUrl } from './is-valid-avatar-url';

export type MemberFormValues = {
  name: string;
  bio: string;
  avatarUrl: string;
};

/** Valida os campos do form de membro. Retorna mensagem de erro ou null. */
export function validateMember(values: MemberFormValues): string | null {
  if (values.name.trim().length < 2) {
    return 'Nome precisa ter pelo menos 2 caracteres.';
  }
  const avatar = values.avatarUrl.trim();
  if (avatar && !isValidAvatarUrl(avatar)) {
    return 'Avatar URL deve ser uma URL http/https válida.';
  }
  return null;
}
