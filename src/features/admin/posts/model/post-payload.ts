import type { PostStatus } from '@prisma/client';
import type { PostFormValues } from './validate-post';

type ValidatedValues = PostFormValues & { status: PostStatus };

export type CreatePostPayload = {
  title: string;
  content: string;
  status: PostStatus;
  coverImageUrl?: string;
  coverImagePath?: string;
  coverImageAlt?: string;
};

export type UpdatePostPayload = {
  title: string;
  content: string;
  status: PostStatus;
  coverImageUrl: string | null;
  coverImagePath: string | null;
  coverImageAlt: string | null;
};

/** Create omits empty optionals — the POST route ignores absent keys. */
export function toCreatePostPayload(values: ValidatedValues): CreatePostPayload {
  return {
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
    title: values.title,
    content: values.content,
    status: values.status,
    coverImageUrl: values.coverImageUrl || null,
    coverImagePath: values.coverImagePath || null,
    coverImageAlt: values.coverImageAlt || null,
  };
}
