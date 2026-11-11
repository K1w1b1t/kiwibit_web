import type { Prisma, PostStatus } from '@prisma/client';
import {
  failure,
  isNonEmptyString,
  rejected,
  valid,
  type ApiFailure,
  type Validated,
} from '@/shared/lib/api-helpers';
import { isPostStatus, resolvePublishedAt } from '@/shared/lib/post-status';
import { isHttpUrl } from '@/shared/lib/url';

/**
 * Server-side shape check for `PUT /api/admin/posts/[id]`.
 *
 * Distinct from `validate-post.ts`, which validates the admin *form* and speaks
 * pt-BR to the operator. This one enforces the API contract and its messages are
 * part of that contract — the route specs assert them verbatim.
 */
export type PostUpdateInput = {
  title?: string;
  content?: string;
  linkedinIntroPt?: string | null;
  linkedinIntroEn?: string | null;
  status?: PostStatus;
  /** Present-but-not-a-string means "clear the column"; absent means "leave it". */
  coverImageUrl?: string | null;
  coverImagePath?: string | null;
  coverImageAlt?: string | null;
};

/** `undefined` keeps the column, anything non-string clears it. */
function nullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

/** Checking and building are split so neither half approaches the complexity budget. */
function checkPostFields({
  title,
  content,
  status,
  coverImageUrl,
  linkedinIntroPt,
  linkedinIntroEn,
}: Record<string, unknown>): ApiFailure | null {
  if (
    [linkedinIntroPt, linkedinIntroEn].some(
      (value) =>
        value !== undefined && value !== null && (typeof value !== 'string' || value.length > 3000),
    )
  ) {
    return failure(
      'BAD_REQUEST',
      'LinkedIn introductions must be strings up to 3000 characters.',
      400,
    );
  }
  if (title !== undefined && !isNonEmptyString(title)) {
    return failure('BAD_REQUEST', 'title must be a non-empty string.', 400);
  }
  if (content !== undefined && !isNonEmptyString(content)) {
    return failure('BAD_REQUEST', 'content must be a non-empty string.', 400);
  }
  if (status !== undefined && !isPostStatus(status)) {
    return failure('BAD_REQUEST', 'status must be draft or published.', 400);
  }
  if (typeof coverImageUrl === 'string' && coverImageUrl !== '' && !isHttpUrl(coverImageUrl)) {
    return failure('BAD_REQUEST', 'coverImageUrl must be an http(s) URL.', 400);
  }
  return null;
}

function buildPostUpdate({
  title,
  content,
  status,
  coverImageUrl,
  coverImagePath,
  coverImageAlt,
  linkedinIntroPt,
  linkedinIntroEn,
}: Record<string, unknown>): PostUpdateInput {
  return {
    ...(typeof title === 'string' && { title }),
    ...(typeof content === 'string' && { content }),
    ...(linkedinIntroPt !== undefined && { linkedinIntroPt: nullableString(linkedinIntroPt) }),
    ...(linkedinIntroEn !== undefined && { linkedinIntroEn: nullableString(linkedinIntroEn) }),
    ...(isPostStatus(status) && { status }),
    ...(coverImageUrl !== undefined && { coverImageUrl: nullableString(coverImageUrl) }),
    ...(coverImagePath !== undefined && { coverImagePath: nullableString(coverImagePath) }),
    ...(coverImageAlt !== undefined && { coverImageAlt: nullableString(coverImageAlt) }),
  };
}

export function validateUpdatePostBody(body: unknown): Validated<PostUpdateInput> {
  const raw = body as Record<string, unknown>;

  const problem = checkPostFields(raw);
  if (problem) return rejected(problem);

  return valid(buildPostUpdate(raw));
}

/**
 * `publishedAt` is derived, never taken from the client: it is stamped the first
 * time a post reaches `published` and preserved afterwards.
 */
export function toPostUpdateData(
  input: PostUpdateInput,
  currentPublishedAt: Date | null,
  now: Date,
): Prisma.PostUpdateInput {
  return {
    ...input,
    ...(input.status !== undefined && {
      publishedAt: resolvePublishedAt(input.status, currentPublishedAt, now),
    }),
  };
}
