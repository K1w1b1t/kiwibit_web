import type { ProjectFormValues } from './validate-project';

export type CreateProjectPayload = {
  title: string;
  description: string;
  repoUrl?: string;
  liveUrl?: string;
};

export type UpdateProjectPayload = {
  title: string;
  description: string;
  repoUrl: string | null;
  liveUrl: string | null;
};

/** Create omits empty optionals: the POST route ignores absent keys. */
export function toCreateProjectPayload(values: ProjectFormValues): CreateProjectPayload {
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    repoUrl: values.repoUrl.trim() || undefined,
    liveUrl: values.liveUrl.trim() || undefined,
  };
}

/**
 * Update sends `null` to clear: the PUT route distinguishes absent (leave as-is)
 * from null (clear the column).
 */
export function toUpdateProjectPayload(values: ProjectFormValues): UpdateProjectPayload {
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    repoUrl: values.repoUrl.trim() || null,
    liveUrl: values.liveUrl.trim() || null,
  };
}
