import type { PostTranslations } from '@/entities/post/model/localized-post';
import type { PostStatus } from '@prisma/client';
import type { PostFormValues } from './validate-post';

type ValidatedValues = PostFormValues & { status: PostStatus };

export type CreatePostPayload = PostTranslations & {
  contentFormat?: 'text' | 'html' | 'markdown';
  title: string;
  content: string;
  status: PostStatus;
  coverImageUrl?: string;
  coverImagePath?: string;
  coverImageAlt?: string;
};

export type UpdatePostPayload = PostTranslations & {
  contentFormat?: 'text' | 'html' | 'markdown';
  title: string;
  content: string;
  status: PostStatus;
  coverImageUrl: string | null;
  coverImagePath: string | null;
  coverImageAlt: string | null;
};

function toTranslationPayload(values: ValidatedValues): PostTranslations {
  return {
    ...(values.titlePt !== undefined && { titlePt: values.titlePt || null }),
    ...(values.titleEn !== undefined && { titleEn: values.titleEn || null }),
    ...(values.contentPt !== undefined && { contentPt: values.contentPt || null }),
    ...(values.contentEn !== undefined && { contentEn: values.contentEn || null }),
    ...(values.coverImageAltPt !== undefined && {
      coverImageAltPt: values.coverImageAltPt || null,
    }),
    ...(values.coverImageAltEn !== undefined && {
      coverImageAltEn: values.coverImageAltEn || null,
    }),
  };
}

/** Create omits empty optionals — the POST route ignores absent keys. */
export function toCreatePostPayload(values: ValidatedValues): CreatePostPayload {
  return {
    ...toTranslationPayload(values),
    contentFormat: values.contentFormat,
    title: values.title,
    content: values.content,
    status: values.status,
    coverImageUrl: values.coverImageUrl || undefined,
    coverImagePath: values.coverImagePath || undefined,
    coverImageAlt: values.coverImageAlt || undefined,
  };
}

/**
 * Update sends `null` to clear. Removing the cover must actually clear the three
 * columns, and the PUT route only clears on an explicit null.
 */
export function toUpdatePostPayload(values: ValidatedValues): UpdatePostPayload {
  return {
    ...toTranslationPayload(values),
    contentFormat: values.contentFormat,
    title: values.title,
    content: values.content,
    status: values.status,
    coverImageUrl: values.coverImageUrl || null,
    coverImagePath: values.coverImagePath || null,
    coverImageAlt: values.coverImageAlt || null,
  };
}
