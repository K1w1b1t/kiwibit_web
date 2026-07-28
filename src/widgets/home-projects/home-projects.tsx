'use client';

import Link from 'next/link';
import { useFeaturedProjects } from '@/features/home/model/use-public-highlights';
import type { Locale } from '@/shared/i18n/config';
import type { Dictionary } from '@/shared/i18n/get-dictionary';
import { ProjectCover } from './project-cover';

interface HomeProjectsProps {
  locale: Locale;
  dict: Dictionary['projects'];
}

function ProjectsLoadingState() {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <article
          key={`project-skeleton-${index}`}
          className="animate-pulse rounded-2xl border border-white/15 bg-white/5 p-5"
        >
          <div className="h-4 w-24 rounded bg-white/20" />
          <div className="mt-4 h-6 w-3/4 rounded bg-white/20" />
          <div className="mt-3 h-4 w-full rounded bg-white/20" />
          <div className="mt-2 h-4 w-5/6 rounded bg-white/20" />
          <div className="mt-5 h-9 w-32 rounded-full bg-white/20" />
        </article>
      ))}
    </div>
  );
}

export function HomeProjects({ locale, dict }: HomeProjectsProps) {
  const { items, isLoading, error } = useFeaturedProjects(6);

  return (
    <section
      id="projects"
      className="matrix-grid-texture scroll-mt-20 bg-[#050505] px-6 py-20 text-white sm:px-10 lg:px-16"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">
              {dict.eyebrow}
            </p>
            <h2 className="mt-2 text-3xl font-black uppercase tracking-[-0.03em] sm:text-4xl">
              {dict.title}
            </h2>
          </div>
          <Link
            href={`/${locale}/projects`}
            className="rounded-full border border-white/25 px-5 py-2 text-sm font-medium uppercase tracking-[0.1em] text-white/80 transition hover:border-white/70 hover:text-white"
          >
            {dict.viewAll}
          </Link>
        </div>

        {isLoading && <ProjectsLoadingState />}

        {!isLoading && error && (
          <div className="rounded-2xl border border-amber-300/40 bg-amber-500/10 p-5 text-sm text-amber-100">
            {dict.error}
          </div>
        )}

        {!isLoading && !error && items.length === 0 && (
          <div className="rounded-2xl border border-white/15 bg-white/5 p-8 text-center text-white/75">
            {dict.empty}
          </div>
        )}

        {!isLoading && !error && items.length > 0 && (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {items.map((project) => (
              <article
                key={project.id}
                id={`project-${project.id}`}
                className="flex h-full flex-col rounded-2xl border border-white/15 bg-white/5 p-5"
              >
                <ProjectCover
                  images={project.images ?? []}
                  projectTitle={project.title}
                  href={`/${locale}/projects/${project.id}`}
                />
                <p className="text-xs uppercase tracking-[0.16em] text-accent">
                  {dict.labels.project}
                </p>
                <h3 className="mt-3 text-xl font-semibold text-white">{project.title}</h3>
                <p className="mt-2 flex-1 text-sm text-white/70">
                  {project.description || dict.labels.noDescription}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {project.liveUrl && (
                    <a
                      href={project.liveUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-black"
                    >
                      {dict.labels.live}
                    </a>
                  )}
                  {project.repoUrl && (
                    <a
                      href={project.repoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-white/30 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/85"
                    >
                      {dict.labels.repository}
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
