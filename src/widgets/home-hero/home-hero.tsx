import Image from 'next/image';
import Link from 'next/link';

const sectionLinks = [
  { href: '#projects', label: 'Projects' },
  { href: '#blog', label: 'Blog' },
  { href: '#team', label: 'Team' },
  { href: '#contact', label: 'Contact' },
] as const;

export function HomeHero() {
  return (
    <section
      id="home"
      className="architectural-grid relative overflow-hidden px-6 pb-24 pt-10 text-slate-100 sm:px-10 lg:px-16"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(255,255,255,0.14),transparent_35%),linear-gradient(135deg,#020202_0%,#050505_45%,#090909_100%)]" />

      <div className="relative mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <Image src="/kiwi.png" alt="Kiwibit logo" width={34} height={34} className="rounded" />
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-white/90">
              Kiwibit
            </span>
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            {sectionLinks.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-full border border-white/25 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-white/80 transition hover:border-white/60 hover:bg-white/10"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </header>

        <div className="mt-20 grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <p className="mb-5 text-xs uppercase tracking-[0.32em] text-white/70">
              Technology Collective
            </p>
            <h1 className="max-w-3xl text-5xl font-black uppercase leading-[0.9] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
              Build Bold Digital
              <span className="text-outline ml-3 inline">Experiences</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base text-white/75 sm:text-lg">
              Explore featured projects, editorial highlights, and the core team in a single
              immersive dark interface inspired by the Kiwibit design language.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/projects"
                className="rounded-full bg-white px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-black transition hover:bg-white/85"
              >
                Explore Projects
              </Link>
              <Link
                href="/blog"
                className="rounded-full border border-white/35 px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-white transition hover:border-white/80"
              >
                Read the Blog
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-white/20 bg-white/5 p-6 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.2em] text-white/85">Live Overview</p>
            <ul className="mt-4 space-y-3 text-sm text-white/80">
              <li className="flex items-center justify-between gap-4 border-b border-white/10 pb-3">
                <span>Featured projects</span>
                <span className="text-white/90">Updated from public API</span>
              </li>
              <li className="flex items-center justify-between gap-4 border-b border-white/10 pb-3">
                <span>Editorial highlights</span>
                <span className="text-white/90">Blog snapshots</span>
              </li>
              <li className="flex items-center justify-between gap-4 pb-1">
                <span>Team members</span>
                <span className="text-white/90">Public profile cards</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
