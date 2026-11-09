import type { PostTranslations } from './localized-post';

const fields = [
  'titlePt',
  'titleEn',
  'contentPt',
  'contentEn',
  'coverImageAltPt',
  'coverImageAltEn',
] as const;
type Existing = PostTranslations & {
  title: string;
  content: string;
  coverImageAlt?: string | null;
};

export function parsePostTranslations(
  raw: Record<string, unknown>,
  existing?: Existing,
): {
  data: Required<PostTranslations> & {
    title: string;
    content: string;
    coverImageAlt: string | null;
  };
  error?: string;
} {
  const data: Required<PostTranslations> = {
    titlePt: existing?.titlePt ?? (existing?.titleEn ? null : (existing?.title ?? null)),
    contentPt: existing?.contentPt ?? (existing?.contentEn ? null : (existing?.content ?? null)),
    titleEn: existing?.titleEn ?? null,
    contentEn: existing?.contentEn ?? null,
    coverImageAltPt: existing?.coverImageAltPt ?? existing?.coverImageAlt ?? null,
    coverImageAltEn: existing?.coverImageAltEn ?? null,
  };
  let error: string | undefined;
  for (const field of fields) {
    if (raw[field] === undefined) continue;
    if (raw[field] !== null && typeof raw[field] !== 'string')
      error = `${field} must be a string or null.`;
    data[field] = typeof raw[field] === 'string' ? raw[field].trim() || null : null;
  }
  for (const [legacy, localized] of [
    ['title', 'titlePt'],
    ['content', 'contentPt'],
    ['coverImageAlt', 'coverImageAltPt'],
  ] as const) {
    if (raw[localized] === undefined && raw[legacy] !== undefined)
      data[localized] = typeof raw[legacy] === 'string' ? raw[legacy].trim() || null : null;
  }
  for (const locale of ['Pt', 'En'] as const) {
    const title = data[`title${locale}`];
    const content = data[`content${locale}`];
    if (Boolean(title) !== Boolean(content))
      error = `title${locale} and content${locale} must be provided together.`;
    if (title && (title.length < 3 || title.length > 200))
      error = `title${locale} must contain 3 to 200 characters.`;
    if (content && content.length < 10 && fields.some((field) => raw[field] !== undefined))
      error = `content${locale} must contain at least 10 characters.`;
    if ((data[`coverImageAlt${locale}`]?.length ?? 0) > 300)
      error = `coverImageAlt${locale} must not exceed 300 characters.`;
  }
  if (!data.titlePt && !data.titleEn)
    error = 'A complete Portuguese or English translation is required.';
  return {
    data: {
      ...data,
      title: data.titlePt || data.titleEn || '',
      content: data.contentPt || data.contentEn || '',
      coverImageAlt: data.coverImageAltPt || data.coverImageAltEn || null,
    },
    error,
  };
}
