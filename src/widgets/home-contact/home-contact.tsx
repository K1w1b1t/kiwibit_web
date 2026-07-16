import Link from 'next/link';

export function HomeContact() {
  return (
    <section
      id="contact"
      className="scroll-mt-20 bg-black px-6 py-16 text-slate-100 sm:px-10 lg:px-16"
    >
      <div className="mx-auto max-w-6xl rounded-3xl border border-white/20 bg-white/5 p-8 backdrop-blur sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/60">Contact</p>
        <h2 className="mt-3 text-4xl font-black uppercase tracking-[-0.03em]">
          Let&apos;s build something useful together.
        </h2>
        <p className="mt-4 max-w-3xl text-white/75">
          Reach out for collaborations, product ideas, or engineering partnerships. We can start
          with a quick conversation and map the next steps.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="mailto:hello@kiwibit.dev"
            className="rounded-full bg-white px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-black transition hover:bg-white/85"
          >
            hello@kiwibit.dev
          </a>
          <Link
            href="#home"
            className="rounded-full border border-white/35 px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-slate-100 transition hover:border-white/80"
          >
            Back to top
          </Link>
        </div>
      </div>
    </section>
  );
}
