import { parseProjectInput, PROJECT_LIMITS } from '@/entities/project/model/project-input';
import type { ProjectTranslations } from '@/entities/project/model/localized-project';
export { PROJECT_LIMITS } from '@/entities/project/model/project-input';
import { isHttpUrl } from '@/shared/lib/url';

export type ProjectFormValues = ProjectTranslations & {
  isFeatured?: boolean;
  featuredOrder?: number;
  title: string;
  description: string;
  repoUrl: string;
  liveUrl: string;
};

export type ProjectField = keyof ProjectFormValues;

export type ProjectFieldErrors = Partial<Record<ProjectField, string>>;

export type ProjectValidationResult =
  | { valid: true; data: ProjectFormValues }
  | { valid: false; fieldErrors: ProjectFieldErrors };

export const EMPTY_PROJECT_FIELD_ERRORS: ProjectFieldErrors = {};

/** Mirrors the server rules in `POST/PUT /api/admin/projects`. */
export function validateProject(values: ProjectFormValues): ProjectValidationResult {
  if (values.titlePt !== undefined || values.titleEn !== undefined) {
    const translated = parseProjectInput(values);
    if (!translated.data)
      return { valid: false, fieldErrors: { [translated.field]: translated.error } };
    return {
      valid: true,
      data: {
        ...values,
        ...translated.data,
        repoUrl: translated.data.repoUrl ?? '',
        liveUrl: translated.data.liveUrl ?? '',
      },
    };
  }
  const title = values.title.trim();
  const description = values.description.trim();
  const repoUrl = values.repoUrl.trim();
  const liveUrl = values.liveUrl.trim();

  const fieldErrors: ProjectFieldErrors = {};

  if (title.length < PROJECT_LIMITS.titleMin) {
    fieldErrors.title = `Título precisa ter pelo menos ${PROJECT_LIMITS.titleMin} caracteres.`;
  } else if (title.length > PROJECT_LIMITS.titleMax) {
    fieldErrors.title = `Título não pode passar de ${PROJECT_LIMITS.titleMax} caracteres.`;
  }

  if (description.length < PROJECT_LIMITS.descriptionMin) {
    fieldErrors.description = `Descrição precisa ter pelo menos ${PROJECT_LIMITS.descriptionMin} caracteres.`;
  } else if (description.length > PROJECT_LIMITS.descriptionMax) {
    fieldErrors.description = `Descrição não pode passar de ${PROJECT_LIMITS.descriptionMax} caracteres.`;
  }

  if (repoUrl && !isHttpUrl(repoUrl)) {
    fieldErrors.repoUrl = 'Informe uma URL http/https válida.';
  }
  if (liveUrl && !isHttpUrl(liveUrl)) {
    fieldErrors.liveUrl = 'Informe uma URL http/https válida.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { valid: false, fieldErrors };
  }

  return { valid: true, data: { title, description, repoUrl, liveUrl } };
}
