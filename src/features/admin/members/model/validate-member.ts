import { isHttpUrl } from '@/shared/lib/url';

export type MemberFormValues = {
  name: string;
  bio: string;
  bioPt?: string;
  bioEn?: string;
  avatarUrl: string;
  /** Bucket key when the avatar was uploaded; empty for a pasted URL. */
  avatarPath: string;
  githubUrl?: string;
  linkedinUrl?: string;
};

export type MemberField =
  | 'name'
  | 'bio'
  | 'bioPt'
  | 'bioEn'
  | 'avatarUrl'
  | 'githubUrl'
  | 'linkedinUrl';

export type MemberFieldErrors = Partial<Record<MemberField, string>>;

export type MemberValidationResult =
  | { valid: true; data: MemberFormValues }
  | { valid: false; fieldErrors: MemberFieldErrors };

export const EMPTY_MEMBER_FIELD_ERRORS: MemberFieldErrors = {};

export const MEMBER_LIMITS = {
  nameMin: 2,
  nameMax: 120,
  bioMax: 2000,
} as const;

/**
 * Pure validation for the member form. Returns per-field messages so the form
 * can mark each control, instead of a single banner string.
 */
export function validateMember(values: MemberFormValues): MemberValidationResult {
  const name = values.name.trim();
  const bio = values.bio.trim();
  const bioPt = values.bioPt?.trim() ?? '';
  const bioEn = values.bioEn?.trim() ?? '';
  const avatarUrl = values.avatarUrl.trim();
  const avatarPath = values.avatarPath.trim();
  const githubUrl = values.githubUrl?.trim() ?? '';
  const linkedinUrl = values.linkedinUrl?.trim() ?? '';

  const fieldErrors: MemberFieldErrors = {};

  if (name.length < MEMBER_LIMITS.nameMin) {
    fieldErrors.name = `Nome precisa ter pelo menos ${MEMBER_LIMITS.nameMin} caracteres.`;
  } else if (name.length > MEMBER_LIMITS.nameMax) {
    fieldErrors.name = `Nome não pode passar de ${MEMBER_LIMITS.nameMax} caracteres.`;
  }

  if (bio.length > MEMBER_LIMITS.bioMax) {
    fieldErrors.bio = `Bio não pode passar de ${MEMBER_LIMITS.bioMax} caracteres.`;
  }

  for (const [field, value] of [
    ['bioPt', bioPt],
    ['bioEn', bioEn],
  ] as const) {
    if (value.length > MEMBER_LIMITS.bioMax) {
      fieldErrors[field] = `Bio não pode passar de ${MEMBER_LIMITS.bioMax} caracteres.`;
    }
  }

  if (avatarUrl && !isHttpUrl(avatarUrl)) {
    fieldErrors.avatarUrl = 'Avatar URL deve ser uma URL http/https válida.';
  }
  if (githubUrl && !isHttpUrl(githubUrl)) fieldErrors.githubUrl = 'Link do GitHub inválido.';
  if (linkedinUrl && !isHttpUrl(linkedinUrl))
    fieldErrors.linkedinUrl = 'Link do LinkedIn inválido.';

  if (Object.keys(fieldErrors).length > 0) {
    return { valid: false, fieldErrors };
  }

  return {
    valid: true,
    data: {
      name,
      bio,
      avatarUrl,
      avatarPath,
      ...(values.bioPt !== undefined && { bioPt }),
      ...(values.bioEn !== undefined && { bioEn }),
      ...(values.githubUrl !== undefined && { githubUrl }),
      ...(values.linkedinUrl !== undefined && { linkedinUrl }),
    },
  };
}
