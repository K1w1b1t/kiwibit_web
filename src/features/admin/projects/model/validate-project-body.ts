import {
  failure,
  isNonEmptyString,
  rejected,
  valid,
  type ApiFailure,
  type Validated,
} from '@/shared/lib/api-helpers';
import { isHttpUrl } from '@/shared/lib/url';

export type ProjectUpdateInput = {
  title?: string;
  description?: string;
  /** Present-but-not-a-string clears the column; absent leaves it untouched. */
  repoUrl?: string | null;
  liveUrl?: string | null;
};

const URL_FIELDS = ['repoUrl', 'liveUrl'] as const;

/** Checking and building are split so neither half approaches the complexity budget. */
function checkProjectFields(raw: Record<string, unknown>): ApiFailure | null {
  const { title, description } = raw;

  if (title !== undefined && !isNonEmptyString(title)) {
    return failure('BAD_REQUEST', 'title must be a non-empty string.', 400);
  }
  if (description !== undefined && !isNonEmptyString(description)) {
    return failure('BAD_REQUEST', 'description must be a non-empty string.', 400);
  }

  for (const field of URL_FIELDS) {
    const value = raw[field];
    if (typeof value === 'string' && value !== '' && !isHttpUrl(value)) {
      return failure('BAD_REQUEST', `${field} must be an http(s) URL.`, 400);
    }
  }
  return null;
}

function buildProjectUpdate({
  title,
  description,
  repoUrl,
  liveUrl,
}: Record<string, unknown>): ProjectUpdateInput {
  return {
    ...(typeof title === 'string' && { title }),
    ...(typeof description === 'string' && { description }),
    ...(repoUrl !== undefined && { repoUrl: typeof repoUrl === 'string' ? repoUrl : null }),
    ...(liveUrl !== undefined && { liveUrl: typeof liveUrl === 'string' ? liveUrl : null }),
  };
}

/** Server-side shape check for `PUT /api/admin/projects/[id]`. */
export function validateUpdateProjectBody(body: unknown): Validated<ProjectUpdateInput> {
  const raw = body as Record<string, unknown>;

  const problem = checkProjectFields(raw);
  if (problem) return rejected(problem);

  return valid(buildProjectUpdate(raw));
}
