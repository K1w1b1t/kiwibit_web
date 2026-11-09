import type { ProjectTranslations } from '@/entities/project/model/localized-project';
import { parseProjectInput } from '@/entities/project/model/project-input';
import type { ProjectFormValues } from './validate-project';

type ProjectPublication = ProjectTranslations & { isFeatured?: boolean; featuredOrder?: number };

export type CreateProjectPayload = ProjectPublication & {
  title: string;
  description: string;
  repoUrl?: string;
  liveUrl?: string;
};

export type UpdateProjectPayload = ProjectPublication & {
  title: string;
  description: string;
  repoUrl: string | null;
  liveUrl: string | null;
};

/** Create omits empty optionals: the POST route ignores absent keys. */
export function toCreateProjectPayload(values: ProjectFormValues): CreateProjectPayload {
  const translated =
    values.titlePt !== undefined || values.titleEn !== undefined
      ? parseProjectInput(values).data
      : undefined;
  return {
    ...translated,
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
  const translated =
    values.titlePt !== undefined || values.titleEn !== undefined
      ? parseProjectInput(values).data
      : undefined;
  return {
    ...translated,
    title: values.title.trim(),
    description: values.description.trim(),
    repoUrl: values.repoUrl.trim() || null,
    liveUrl: values.liveUrl.trim() || null,
  };
}
