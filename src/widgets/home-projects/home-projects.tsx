'use client';

import Link from 'next/link';
import { ArrowDownRight, ArrowLeft, ArrowRight } from 'lucide-react';
import { localizeProject } from '@/entities/project/model/localized-project';
import { useFeaturedProjects } from '@/features/home/model/use-public-highlights';
import { useProjectShowcase } from '@/features/home/model/use-project-showcase';
import type { Locale } from '@/shared/i18n/config';
import type { Dictionary } from '@/shared/i18n/get-dictionary';
import { ProjectCover } from './project-cover';

interface HomeProjectsProps {
  variant?: 'showcase' | 'list';
  locale: Locale;
  dict: Dictionary['projects'];
}

function ProjectsLoadingState() {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-busy="true">
      {Array.from({ length: 3 }, (_, index) => (
        <div
          key={index}
          className="motion-safe:animate-pulse rounded-2xl border border-white/15 bg-white/5 p-5"
        >
          <div className="aspect-video rounded-xl bg-white/10" />
          <div className="mt-5 h-6 w-3/4 rounded bg-white/10" />
          <div className="mt-3 h-4 rounded bg-white/10" />
        </div>
      ))}
    </div>
  );
}

export function HomeProjects({ locale, dict, variant = 'list' }: Readonly<HomeProjectsProps>) {
  const showcase = variant === 'showcase';
  const { items, isLoading, error } = useFeaturedProjects(6, showcase);
  const {
    track,
    index: activeIndex,
    atStart,
    atEnd,
    updatePosition,
    goTo,
  } = useProjectShowcase(
    `${variant}:${locale}:${isLoading}:${items.map((item) => item.id).join(',')}`,
  );
  const showItems = !isLoading && !error && items.length > 0;
  const hasControls = showcase && showItems && items.length > 1;

  return (
    <section
      id="projects"
      aria-labelledby="projects-heading"
      className="relative scroll-mt-20 overflow-hidden border-y border-white/10 bg-[#050505] px-6 py-20 text-white sm:px-10 lg:px-16"
    >
      {showcase && <span id="products" className="absolute top-0 scroll-mt-20" />}
      <div className="mx-auto max-w-6xl">
        {showcase && (
          <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className="mb-3 flex items-center gap-3 font-mono text-xs uppercase tracking-[0.24em] text-accent">
                <span className="h-px w-8 bg-accent" />
                {dict.eyebrow}
              </p>
              <h2
                id="projects-heading"
                className="text-4xl font-black uppercase tracking-[-0.04em] sm:text-5xl"
              >
                {dict.title}
                <span className="text-accent">.</span>
              </h2>
              {showcase && <p className="mt-4 text-white/60">{dict.subtitle}</p>}
            </div>
            <Link
              href={`/${locale}/projects`}
              className="inline-flex items-center gap-3 rounded-full border border-white/25 px-5 py-3 text-xs font-semibold uppercase tracking-widest transition hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
            >
              {dict.viewAll}
              <ArrowDownRight size={16} aria-hidden="true" />
            </Link>
          </div>
        )}
        {isLoading && <ProjectsLoadingState />}
        {!isLoading && error && (
          <output className="rounded-2xl border border-amber-300/40 bg-amber-500/10 p-6 text-amber-100">
            {dict.error}
          </output>
        )}
        {!isLoading && !error && items.length === 0 && (
          <p className="rounded-2xl border border-white/15 bg-white/5 p-8 text-white/70">
            {dict.empty}
          </p>
        )}
        {showItems && (
          <section
            ref={track}
            id="projects-track"
            onScroll={updatePosition}
            aria-roledescription={showcase ? dict.showcase.role : undefined}
            aria-label={dict.title}
            tabIndex={showcase ? 0 : undefined}
            onKeyDown={(event) => {
              if (!showcase || event.target !== event.currentTarget) return;
              if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                event.preventDefault();
                goTo(
                  Math.max(
                    0,
                    Math.min(items.length - 1, activeIndex + (event.key === 'ArrowRight' ? 1 : -1)),
                  ),
                );
              }
            }}
            className={
              showcase
                ? 'relative flex snap-x snap-mandatory items-stretch gap-5 overflow-x-auto pb-3 focus-visible:outline-2 focus-visible:outline-accent'
                : 'flex flex-col gap-6'
            }
          >
            {items
              .map((item) => localizeProject(item, locale))
              .map((project, index) => (
                <article
                  key={project.id}
                  id={`project-${project.id}`}
                  className={
                    showcase
                      ? 'group flex w-[90%] shrink-0 snap-start flex-col overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-white/[0.07] to-white/[0.02] md:w-[88%] lg:grid lg:grid-cols-[1.15fr_1fr]'
                      : 'flex flex-col overflow-hidden rounded-2xl border border-white/15 bg-white/[0.03] md:grid md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]'
                  }
                >
                  <ProjectCover
                    images={project.images ?? []}
                    projectTitle={project.title}
                    href={`/${locale}/projects/${project.id}`}
                    showcase={showcase}
                  />
                  <div
                    className={
                      showcase
                        ? 'flex min-w-0 flex-col p-6 sm:p-8 lg:justify-center lg:p-10'
                        : 'flex flex-1 flex-col p-5'
                    }
                  >
                    <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
                      {dict.labels.project}{' '}
                      <span className="ml-2 text-white/30">
                        / {String(index + 1).padStart(2, '0')}
                      </span>
                    </p>
                    <h3
                      className={`mt-4 break-words font-semibold tracking-tight ${showcase ? 'text-2xl sm:text-3xl' : 'text-xl'}`}
                    >
                      <Link
                        href={`/${locale}/projects/${project.id}`}
                        className="focus-visible:outline-2 focus-visible:outline-accent"
                      >
                        {project.title}
                      </Link>
                    </h3>
                    <p className="mt-4 line-clamp-3 break-words text-sm leading-relaxed text-white/60">
                      {project.description || dict.labels.noDescription}
                    </p>
                    <div className="mt-7 flex flex-wrap items-center gap-3">
                      <Link
                        href={`/${locale}/projects/${project.id}`}
                        className="inline-flex items-center gap-3 rounded-full bg-accent px-5 py-3 text-xs font-bold uppercase tracking-widest text-black transition hover:bg-accent/80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
                      >
                        {dict.labels.viewProject}
                        <ArrowRight size={16} aria-hidden="true" />
                      </Link>
                      {project.repoUrl && (
                        <a
                          href={project.repoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-white/25 px-4 py-3 text-xs text-white/70 hover:text-white"
                        >
                          {dict.labels.repository}
                        </a>
                      )}
                      {project.liveUrl && (
                        <a
                          href={project.liveUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-white/25 px-4 py-3 text-xs text-white/70 hover:text-white"
                        >
                          {dict.labels.live}
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              ))}
          </section>
        )}
        {hasControls && (
          <div className="mt-5 flex items-center justify-between gap-4">
            <div className="flex flex-wrap gap-1">
              {items.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => goTo(index)}
                  aria-label={`${dict.showcase.goTo} ${index + 1}`}
                  aria-current={activeIndex === index ? 'true' : undefined}
                  className="flex min-h-11 min-w-11 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-accent"
                >
                  <span
                    className={`h-1 rounded-full transition-all motion-reduce:transition-none ${activeIndex === index ? 'w-8 bg-accent' : 'w-3 bg-white/25'}`}
                  />
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              {([-1, 1] as const).map((direction) => (
                <button
                  key={direction}
                  type="button"
                  aria-controls="projects-track"
                  aria-label={direction < 0 ? dict.showcase.previous : dict.showcase.next}
                  disabled={direction < 0 ? atStart : atEnd}
                  onClick={() => goTo(activeIndex + direction)}
                  className="rounded-full border border-white/25 p-3 transition hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-default disabled:opacity-25"
                >
                  {direction < 0 ? <ArrowLeft size={20} /> : <ArrowRight size={20} />}
                </button>
              ))}
            </div>
            <span className="sr-only" aria-live="polite" aria-atomic="true">
              {activeIndex + 1} / {items.length}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
