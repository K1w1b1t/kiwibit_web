import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isLocale } from '@/shared/i18n/config';
import { getDictionary } from '@/shared/i18n/get-dictionary';
import { localizedAlternates } from '@/shared/lib/seo';
import { prisma } from '@/shared/lib/prisma';
import { ProjectCarousel } from '@/widgets/project-detail/project-carousel';

type Params = { params: Promise<{ locale: string; id: string }> };

const IMAGE_SELECT = {
  orderBy: [{ position: 'asc' as const }, { createdAt: 'asc' as const }],
  select: { id: true, url: true, alt: true, isCover: true },
};

/**
 * A project's own page — the only place the full carousel is shown; listings
 * render just the cover.
 *
 * Rendered on demand rather than statically: projects and their images change
 * from the admin, and a stale build would show the wrong gallery.
 */
async function findProject(id: string) {
  return prisma.project.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      repoUrl: true,
      liveUrl: true,
      images: IMAGE_SELECT,
    },
  });
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, id } = await params;
  if (!isLocale(locale)) return {};

  const project = await findProject(id);
  if (!project) return {};

  return {
    title: project.title,
    description: project.description.slice(0, 160),
    alternates: localizedAlternates(locale, `/projects/${id}`),
  };
}

export default async function ProjectDetailPage({ params }: Params) {
  const { locale, id } = await params;
  if (!isLocale(locale)) return null;

  const dict = getDictionary(locale);
  const project = await findProject(id);

  if (!project) notFound();

  return (
    <main className="bg-[#050505] px-6 py-16 text-white sm:px-10 lg:px-16">
      <div className="mx-auto max-w-4xl">
        <Link
          href={`/${locale}/projects`}
          className="text-xs uppercase tracking-[0.14em] text-white/40 transition hover:text-white"
        >
          ← {dict.projects.title}
        </Link>

        <p className="mt-6 text-xs uppercase tracking-[0.28em] text-accent">
          {dict.projects.labels.project}
        </p>
        <h1 className="mt-3 text-4xl font-black uppercase tracking-[-0.03em] sm:text-5xl">
          {project.title}
        </h1>

        <div className="mt-8">
          <ProjectCarousel
            images={project.images}
            projectTitle={project.title}
            labels={dict.projects.carousel}
          />
        </div>

        <p className="mt-8 whitespace-pre-line text-white/75">
          {project.description || dict.projects.labels.noDescription}
        </p>

        <div className="mt-8 flex flex-wrap gap-2">
          {project.liveUrl && (
            <a
              href={project.liveUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-white px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-black"
            >
              {dict.projects.labels.live}
            </a>
          )}
          {project.repoUrl && (
            <a
              href={project.repoUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/30 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-white/85"
            >
              {dict.projects.labels.repository}
            </a>
          )}
        </div>
      </div>
    </main>
  );
}
