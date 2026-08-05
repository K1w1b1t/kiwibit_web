import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isLocale, htmlLang } from '@/shared/i18n/config';
import { getDictionary } from '@/shared/i18n/get-dictionary';
import { localizedAlternates } from '@/shared/lib/seo';
import { prisma } from '@/shared/lib/prisma';
import { PostCover } from '@/shared/ui/post-cover';

type Params = { params: Promise<{ locale: string; id: string }> };

/**
 * A post's own reading page. Rendered on demand rather than statically: posts
 * are published/edited from the admin, and a stale build would hide new content
 * or show drafts.
 */
async function findPost(id: string) {
  const post = await prisma.post.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      content: true,
      coverImageUrl: true,
      coverImageAlt: true,
      publishedAt: true,
      updatedAt: true,
      status: true,
      author: { select: { name: true } },
    },
  });
  // A draft is indistinguishable from a missing post to the public.
  if (!post || post.status !== 'published') return null;
  return post;
}

/** A few other published posts to keep the reader going. */
async function findSuggestions(excludeId: string) {
  return prisma.post.findMany({
    where: { status: 'published', id: { not: excludeId } },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    take: 3,
    select: {
      id: true,
      title: true,
      coverImageUrl: true,
      coverImageAlt: true,
      author: { select: { name: true } },
    },
  });
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, id } = await params;
  if (!isLocale(locale)) return {};

  const post = await findPost(id);
  if (!post) return {};

  return {
    title: post.title,
    description: post.content.slice(0, 160),
    alternates: localizedAlternates(locale, `/blog/${id}`),
  };
}

export default async function PostDetailPage({ params }: Readonly<Params>) {
  const { locale, id } = await params;
  if (!isLocale(locale)) return null;

  const dict = getDictionary(locale);
  const post = await findPost(id);

  if (!post) notFound();

  const suggestions = await findSuggestions(post.id);
  const publishedOn = post.publishedAt ?? post.updatedAt;

  return (
    <main className="bg-[#050505] px-6 py-16 text-white sm:px-10 lg:px-16">
      <article className="mx-auto max-w-3xl">
        <Link
          href={`/${locale}/blog`}
          className="text-xs uppercase tracking-[0.14em] text-white/40 transition hover:text-white"
        >
          ← {dict.blog.post.backToAll}
        </Link>

        <p className="mt-6 text-xs uppercase tracking-[0.28em] text-accent">
          {dict.blog.labels.article}
        </p>
        <h1 className="mt-3 text-4xl font-black uppercase tracking-[-0.03em] sm:text-5xl">
          {post.title}
        </h1>

        <p className="mt-4 text-sm text-white/60">
          {dict.blog.post.by} {post.author?.name ?? '—'}
          <span className="mx-2 text-white/25">•</span>
          {new Date(publishedOn).toLocaleDateString(htmlLang[locale])}
        </p>

        <PostCover
          url={post.coverImageUrl}
          alt={post.coverImageAlt ?? post.title}
          sizes="(min-width: 768px) 768px, 100vw"
          priority
          className="mt-8 aspect-[21/9] w-full rounded-2xl border border-white/10"
        />

        <div className="mt-10 whitespace-pre-line text-lg leading-relaxed text-white/80">
          {post.content}
        </div>
      </article>

      {suggestions.length > 0 && (
        <section className="mx-auto mt-20 max-w-5xl border-t border-white/10 pt-12">
          <h2 className="text-2xl font-black uppercase tracking-[-0.02em]">
            {dict.blog.post.suggestions}
          </h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {suggestions.map((item) => (
              <Link
                key={item.id}
                href={`/${locale}/blog/${item.id}`}
                className="group flex flex-col rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4 transition hover:border-white/40"
              >
                <PostCover
                  url={item.coverImageUrl}
                  alt={item.coverImageAlt ?? item.title}
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="mb-4 aspect-[16/9] w-full rounded-xl border border-white/10"
                />
                <h3 className="text-base font-semibold group-hover:text-white">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-400">
                  {dict.blog.post.by} {item.author?.name ?? '—'}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
