import { isHttpUrl } from '@/shared/lib/url';
import { isPostStatus } from '@/shared/lib/post-status';
import type { PostStatus } from '@prisma/client';

export type PostFormValues = {
  title: string;
  content: string;
  status: string;
  coverImageUrl: string;
  /** Bucket key; empty when the cover URL is externally hosted. */
  coverImagePath: string;
  coverImageAlt: string;
};

export type PostField = 'title' | 'content' | 'status' | 'coverImageUrl' | 'coverImageAlt';

export type PostFieldErrors = Partial<Record<PostField, string>>;

export type PostValidationResult =
  | { valid: true; data: PostFormValues & { status: PostStatus } }
  | { valid: false; fieldErrors: PostFieldErrors };

export const EMPTY_POST_FIELD_ERRORS: PostFieldErrors = {};

export const POST_LIMITS = {
  titleMin: 3,
  titleMax: 200,
  contentMin: 10,
  altMax: 300,
} as const;

/** Mirrors the server rules in `POST/PUT /api/admin/posts`. */
export function validatePost(values: PostFormValues): PostValidationResult {
  const title = values.title.trim();
  const content = values.content.trim();
  const coverImageUrl = values.coverImageUrl.trim();
  const coverImageAlt = values.coverImageAlt.trim();

  const fieldErrors: PostFieldErrors = {};

  if (title.length < POST_LIMITS.titleMin) {
    fieldErrors.title = `Título precisa ter pelo menos ${POST_LIMITS.titleMin} caracteres.`;
  } else if (title.length > POST_LIMITS.titleMax) {
    fieldErrors.title = `Título não pode passar de ${POST_LIMITS.titleMax} caracteres.`;
  }

  if (content.length < POST_LIMITS.contentMin) {
    fieldErrors.content = `Conteúdo precisa ter pelo menos ${POST_LIMITS.contentMin} caracteres.`;
  }

  if (!isPostStatus(values.status)) {
    fieldErrors.status = 'Status inválido.';
  }

  if (coverImageUrl && !isHttpUrl(coverImageUrl)) {
    fieldErrors.coverImageUrl = 'A capa precisa ser uma URL http/https válida.';
  }

  if (coverImageAlt.length > POST_LIMITS.altMax) {
    fieldErrors.coverImageAlt = `Texto alternativo não pode passar de ${POST_LIMITS.altMax} caracteres.`;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { valid: false, fieldErrors };
  }

  return {
    valid: true,
    data: {
      title,
      content,
      status: values.status as PostStatus,
      coverImageUrl,
      coverImagePath: values.coverImagePath,
      coverImageAlt,
    },
  };
}
