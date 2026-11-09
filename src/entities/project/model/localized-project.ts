import type { Locale } from '@/shared/i18n/config';
export type ProjectTranslations = {
  titlePt?: string | null;
  titleEn?: string | null;
  descriptionPt?: string | null;
  descriptionEn?: string | null;
};
export function localizeProject<
  T extends ProjectTranslations & { title: string; description: string },
>(project: T, locale: Locale): T {
  const preferred = locale === 'en' ? 'En' : 'Pt';
  const other = preferred === 'En' ? 'Pt' : 'En';
  const language =
    project[`title${preferred}`]?.trim() && project[`description${preferred}`]?.trim()
      ? preferred
      : project[`title${other}`]?.trim() && project[`description${other}`]?.trim()
        ? other
        : null;
  return {
    ...project,
    title: (language ? project[`title${language}`]?.trim() : null) || project.title,
    description:
      (language ? project[`description${language}`]?.trim() : null) || project.description,
  };
}
