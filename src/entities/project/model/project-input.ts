import type { ProjectTranslations } from './localized-project';
import { isHttpUrl } from '@/shared/lib/url';

export const PROJECT_LIMITS = {
  titleMin: 2,
  titleMax: 160,
  descriptionMin: 10,
  descriptionMax: 4000,
} as const;
type Existing = ProjectTranslations & { title: string; description: string };
type ProjectInput = Required<ProjectTranslations> & {
  title: string;
  description: string;
  isFeatured?: boolean;
  featuredOrder?: number;
  repoUrl?: string | null;
  liveUrl?: string | null;
};
type Problem = { error: string; field: string };
type Result =
  | { data: ProjectInput; error?: undefined; field?: undefined }
  | (Problem & { data?: undefined });
type Language = 'Pt' | 'En';

function initialInput(existing?: Existing): ProjectInput {
  const legacyTitle = existing?.titleEn ? null : (existing?.title ?? null);
  const legacyDescription = existing?.titleEn ? null : (existing?.description ?? null);
  return {
    title: '',
    description: '',
    titlePt: existing?.titlePt ?? legacyTitle,
    descriptionPt: existing?.descriptionPt ?? legacyDescription,
    titleEn: existing?.titleEn ?? null,
    descriptionEn: existing?.descriptionEn ?? null,
  };
}

function applyLanguage(
  raw: Record<string, unknown>,
  data: ProjectInput,
  language: Language,
): Problem | undefined {
  for (const field of ['title', 'description'] as const) {
    const key = `${field}${language}` as const;
    let value = raw[key];
    if (value === undefined && language === 'Pt') value = raw[field];
    if (value === undefined) continue;
    if (value !== null && typeof value !== 'string')
      return { error: `${key} must be a string or null.`, field: key };
    data[key] = typeof value === 'string' ? value.trim() || null : null;
  }
}

function validateLanguage(
  raw: Record<string, unknown>,
  data: ProjectInput,
  language: Language,
): Problem | undefined {
  const title = data[`title${language}`];
  const description = data[`description${language}`];
  if (Boolean(title) !== Boolean(description))
    return {
      error: 'Provide both title and description for each translation.',
      field: title ? `description${language}` : `title${language}`,
    };
  // Legacy APIs historically accepted any nonempty text; limits apply to explicitly edited translations.
  const edited =
    raw[`title${language}`] !== undefined || raw[`description${language}`] !== undefined;
  if (!edited) return;
  if (title && (title.length < PROJECT_LIMITS.titleMin || title.length > PROJECT_LIMITS.titleMax))
    return { error: 'Title must contain 2 to 160 characters.', field: `title${language}` };
  if (
    description &&
    (description.length < PROJECT_LIMITS.descriptionMin ||
      description.length > PROJECT_LIMITS.descriptionMax)
  )
    return {
      error: 'Description must contain 10 to 4000 characters.',
      field: `description${language}`,
    };
}

function applyPublicationFields(
  raw: Record<string, unknown>,
  data: ProjectInput,
): Problem | undefined {
  if (raw.isFeatured !== undefined) {
    if (typeof raw.isFeatured !== 'boolean')
      return { error: 'isFeatured must be boolean.', field: 'isFeatured' };
    data.isFeatured = raw.isFeatured;
  }
  if (raw.featuredOrder === undefined) return;
  if (
    typeof raw.featuredOrder !== 'number' ||
    !Number.isSafeInteger(raw.featuredOrder) ||
    raw.featuredOrder < 1 ||
    raw.featuredOrder > 2147483647
  )
    return { error: 'Order must be an integer between 1 and 2147483647.', field: 'featuredOrder' };
  data.featuredOrder = raw.featuredOrder;
}

function applyUrls(raw: Record<string, unknown>, data: ProjectInput): Problem | undefined {
  for (const field of ['repoUrl', 'liveUrl'] as const) {
    const value = raw[field];
    if (value === undefined) continue;
    if (value !== null && typeof value !== 'string')
      return { error: `${field} must be an http(s) URL or null.`, field };
    if (typeof value === 'string' && value.trim() && !isHttpUrl(value.trim()))
      return { error: `${field} must be an http(s) URL.`, field };
    data[field] = typeof value === 'string' ? value.trim() || null : null;
  }
}

/** Preserves omitted translations and accepts legacy clients without rewriting the other language. */
export function parseProjectInput(body: unknown, existing?: Existing): Result {
  if (!body || typeof body !== 'object' || Array.isArray(body))
    return { error: 'Expected a JSON object.', field: 'title' };
  const raw = body as Record<string, unknown>;
  const data = initialInput(existing);
  for (const language of ['Pt', 'En'] as const) {
    const problem = applyLanguage(raw, data, language) ?? validateLanguage(raw, data, language);
    if (problem) return problem;
  }
  if (!data.titlePt && !data.titleEn)
    return { error: 'A complete Portuguese or English translation is required.', field: 'titlePt' };
  data.title = data.titlePt || data.titleEn || '';
  data.description = data.descriptionPt || data.descriptionEn || '';
  const problem = applyPublicationFields(raw, data) ?? applyUrls(raw, data);
  if (problem) return problem;
  return { data };
}
