import type { Locale } from '@/shared/i18n/config';

export type PostTranslations = {
  titlePt?: string | null;
  titleEn?: string | null;
  contentPt?: string | null;
  contentEn?: string | null;
  coverImageAltPt?: string | null;
  coverImageAltEn?: string | null;
};

export function localizePost<
  T extends PostTranslations & { title: string; content?: string; coverImageAlt?: string | null },
>(post: T, locale: Locale): T {
  const english =
    locale === 'en'
      ? Boolean(post.titleEn?.trim())
      : !post.titlePt?.trim() && Boolean(post.titleEn?.trim());
  return {
    ...post,
    title: (english ? post.titleEn : post.titlePt)?.trim() || post.title,
    ...(post.content !== undefined && {
      content: (english ? post.contentEn : post.contentPt)?.trim() || post.content,
    }),
    coverImageAlt:
      (locale === 'en' ? post.coverImageAltEn : post.coverImageAltPt)?.trim() ||
      (locale === 'en' ? post.coverImageAltPt : post.coverImageAltEn)?.trim() ||
      post.coverImageAlt ||
      (english ? post.titleEn : post.titlePt) ||
      post.title,
  };
}
