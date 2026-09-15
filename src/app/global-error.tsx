'use client';
import { useEffect } from 'react';
import { captureBrowserException } from '@/shared/lib/analytics';
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureBrowserException(error);
  }, [error]);
  return (
    <html lang="en">
      <body className="bg-zinc-950 text-white">
        <main role="alert" className="mx-auto max-w-xl p-12">
          <title>Unexpected error | Kiwibit</title>
          <h1 className="text-3xl font-bold">Something went wrong</h1>
          <p className="mt-4">Please try again. If the issue continues, come back later.</p>
          <button
            type="button"
            className="mt-6 rounded bg-emerald-500 px-4 py-2 text-black"
            onClick={reset}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
