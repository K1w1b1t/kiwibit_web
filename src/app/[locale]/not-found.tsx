import Link from 'next/link';

// not-found.tsx does not receive route params, so it stays locale-agnostic.
export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center bg-black px-6 text-center text-white">
      <p className="font-mono text-sm text-accent">[ 404 ]</p>
      <h1 className="mt-4 text-3xl font-black uppercase tracking-[-0.03em]">
        Página não encontrada / Page not found
      </h1>
      <p className="mt-3 max-w-md text-white/60">
        A página que você procura não existe ou foi movida. The page you are looking for does not
        exist or has been moved.
      </p>
      <Link
        href="/pt"
        className="mt-8 inline-flex rounded-full bg-accent px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-black transition hover:bg-accent/85"
      >
        Kiwibit
      </Link>
    </main>
  );
}
