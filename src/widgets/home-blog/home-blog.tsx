'use client';

import Link from 'next/link';
import { useHighlightedPosts } from '@/features/home/model/use-public-highlights';

function BlogLoadingState() {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <article
          key={`blog-skeleton-${index}`}
          className="animate-pulse rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5"
        >
          <div className="h-4 w-20 rounded bg-slate-700" />
          <div className="mt-4 h-6 w-5/6 rounded bg-slate-700" />
          <div className="mt-3 h-4 w-full rounded bg-slate-700" />
          <div className="mt-2 h-4 w-4/6 rounded bg-slate-700" />
          <div className="mt-6 h-8 w-24 rounded-full bg-slate-700" />
        </article>
      ))}
    </div>
  );
}

export function HomeBlog() {
  const { items, isLoading, error } = useHighlightedPosts(4);

  return (
    <section
      id="blog"
      className="scroll-mt-20 bg-[#030303] px-6 py-16 text-slate-100 sm:px-10 lg:px-16"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/60">
              Content
            </p>
            <h2 className="mt-2 text-4xl font-black uppercase tracking-[-0.03em]">
              Blog Highlights
            </h2>
          </div>
          <Link
            href="/blog"
            className="rounded-full border border-white/25 px-5 py-2 text-sm font-medium uppercase tracking-[0.1em] text-white/80 transition hover:border-white/70 hover:text-white"
          >
            View all posts
          </Link>
        </div>

        {isLoading && <BlogLoadingState />}

        {!isLoading && error && (
          <div className="rounded-2xl border border-amber-300/40 bg-amber-500/10 p-5 text-sm text-amber-100">
            Could not load blog highlights right now.
          </div>
        )}

        {!isLoading && !error && items.length === 0 && (
          <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-8 text-center text-slate-300">
            No blog highlights published yet.
          </div>
        )}

        {!isLoading && !error && items.length > 0 && (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {items.map((post) => (
              <article
                key={post.id}
                id={`post-${post.id}`}
                className="flex h-full flex-col rounded-2xl border border-slate-700/70 bg-slate-900/70 p-5"
              >
                <p className="text-xs uppercase tracking-[0.16em] text-white/60">Article</p>
                <h3 className="mt-3 text-lg font-semibold">{post.title}</h3>
                <p className="mt-3 text-sm text-slate-300">Author ID: {post.authorId}</p>
                <p className="mt-1 text-xs text-slate-400">
                  Updated {new Date(post.updatedAt).toLocaleDateString('en-US')}
                </p>
                <Link
                  href={`/blog#post-${post.id}`}
                  className="mt-6 inline-flex w-fit rounded-full border border-white/30 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:border-white/80"
                >
                  Read summary
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
