import {
  localizeProject,
  type ProjectTranslations,
} from '@/entities/project/model/localized-project';
import { triggerLinkedInAutoPost } from '@/shared/lib/linkedin';
import { reportServerError } from '@/shared/lib/discord';
import { absoluteUrl } from '@/shared/lib/seo';

type PublishedProject = ProjectTranslations & { id: string; title: string; description: string };

/** Called once after project creation; edits and gallery uploads do not republish. */
export async function publishProjectToLinkedIn(project: PublishedProject) {
  let locale: 'pt' | 'en' = 'pt';
  if (
    !(project.titlePt?.trim() && project.descriptionPt?.trim()) &&
    project.titleEn?.trim() &&
    project.descriptionEn?.trim()
  )
    locale = 'en';
  const localized = localizeProject(project, locale);
  const result = await triggerLinkedInAutoPost('company', {
    title: `${locale === 'pt' ? 'Novo projeto da Kiwibit' : 'New Kiwibit project'}: ${localized.title}`,
    summary: localized.description.replace(/\s+/g, ' ').trim().slice(0, 180),
    url: absoluteUrl(`/${locale}/projects/${project.id}`),
  });
  if (!result.ok && !result.skipped) {
    await reportServerError({
      source: 'linkedinProjectAutoPost',
      code: result.code ?? 'LINKEDIN_POST_FAILED',
      status: result.status,
      message: 'LinkedIn company publication failed after project creation.',
    });
  }
  return result;
}
