import Link from 'next/link';
import { HomeBlog } from '@/widgets/home-blog/home-blog';

export const dynamic = 'force-static';

export default function BlogPage() {
  return (
    <main>
      <Link
        href="/"
        aria-label="Back to home"
        className="fixed left-4 top-4 z-50 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-black/70 text-xl font-semibold text-white shadow-sm backdrop-blur transition hover:border-white/70"
      >
        {'<'}
      </Link>

      <section className="bg-black px-6 py-14 text-white sm:px-10 lg:px-16">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs uppercase tracking-[0.28em] text-white/60">Public route</p>
          <h1 className="mt-3 text-5xl font-black uppercase tracking-[-0.03em] sm:text-6xl">
            Blog
          </h1>
          <p className="mt-4 max-w-3xl text-white/75">
            Recent posts loaded from the public endpoint and grouped as highlights.
          </p>
        </div>
      </section>
      <HomeBlog />
    </main>
  );
}
