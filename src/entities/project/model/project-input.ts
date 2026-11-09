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
type Result =
  | { data: ProjectInput; error?: undefined; field?: undefined }
  | { data?: undefined; error: string; field: string };

/** Preserves omitted translations and accepts legacy clients without rewriting the other language. */
export function parseProjectInput(body: unknown, existing?: Existing): Result {
  if (!body || typeof body !== 'object' || Array.isArray(body))
    return { error: 'Expected a JSON object.', field: 'title' };
  const raw = body as Record<string, unknown>;
  const data: ProjectInput = {
    title: '',
    description: '',
    titlePt: existing?.titlePt ?? (!existing?.titleEn ? (existing?.title ?? null) : null),
    descriptionPt:
      existing?.descriptionPt ?? (!existing?.titleEn ? (existing?.description ?? null) : null),
    titleEn: existing?.titleEn ?? null,
    descriptionEn: existing?.descriptionEn ?? null,
  };
  for (const suffix of ['Pt', 'En'] as const) {
    for (const field of ['title', 'description'] as const) {
      const key = `${field}${suffix}` as const;
      const value = raw[key] !== undefined ? raw[key] : suffix === 'Pt' ? raw[field] : undefined;
      if (value === undefined) continue;
      if (value !== null && typeof value !== 'string')
        return { error: `${key} must be a string or null.`, field: key };
      data[key] = typeof value === 'string' ? value.trim() || null : null;
    }
    const title = data[`title${suffix}`];
    const description = data[`description${suffix}`];
    if (Boolean(title) !== Boolean(description))
      return {
        error: 'Provide both title and description for each translation.',
        field: title ? `description${suffix}` : `title${suffix}`,
      };
    // Legacy APIs historically accepted any nonempty text. Apply length limits to explicitly edited translations.
    const edited = raw[`title${suffix}`] !== undefined || raw[`description${suffix}`] !== undefined;
    if (
      edited &&
      title &&
      (title.length < PROJECT_LIMITS.titleMin || title.length > PROJECT_LIMITS.titleMax)
    )
      return { error: 'Title must contain 2 to 160 characters.', field: `title${suffix}` };
    if (
      edited &&
      description &&
      (description.length < PROJECT_LIMITS.descriptionMin ||
        description.length > PROJECT_LIMITS.descriptionMax)
    )
      return {
        error: 'Description must contain 10 to 4000 characters.',
        field: `description${suffix}`,
      };
  }
  if (!data.titlePt && !data.titleEn)
    return { error: 'A complete Portuguese or English translation is required.', field: 'titlePt' };
  data.title = data.titlePt || data.titleEn || '';
  data.description = data.descriptionPt || data.descriptionEn || '';
  if (raw.isFeatured !== undefined) {
    if (typeof raw.isFeatured !== 'boolean')
      return { error: 'isFeatured must be boolean.', field: 'isFeatured' };
    data.isFeatured = raw.isFeatured;
  }
  if (raw.featuredOrder !== undefined) {
    if (
      typeof raw.featuredOrder !== 'number' ||
      !Number.isSafeInteger(raw.featuredOrder) ||
      raw.featuredOrder < 1 ||
      raw.featuredOrder > 2147483647
    )
      return {
        error: 'Order must be an integer between 1 and 2147483647.',
        field: 'featuredOrder',
      };
    data.featuredOrder = raw.featuredOrder;
  }
  for (const field of ['repoUrl', 'liveUrl'] as const) {
    const value = raw[field];
    if (value === undefined) continue;
    if (value !== null && typeof value !== 'string')
      return { error: `${field} must be an http(s) URL or null.`, field };
    if (typeof value === 'string' && value.trim() && !isHttpUrl(value.trim()))
      return { error: `${field} must be an http(s) URL.`, field };
    data[field] = typeof value === 'string' ? value.trim() || null : null;
  }
  return { data };
}
