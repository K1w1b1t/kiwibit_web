import type { Locale } from '@/shared/i18n/config';

type MemberBios = {
  bioPt: string | null;
  bioEn: string | null;
};

type MemberBioLabels = {
  noBio: string;
};

/** Returns the bio for the active locale, or a locale-aware "coming soon" message. */
export function getMemberBio(member: MemberBios, locale: Locale, labels: MemberBioLabels): string {
  const localizedBio = locale === 'en' ? member.bioEn : member.bioPt;
  if (localizedBio && localizedBio.trim().length > 0) return localizedBio;

  return labels.noBio;
}
