'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { HomeProjectImage } from '@/features/home/model/types';

type Props = {
  images: readonly HomeProjectImage[];
  /** Fallback alt text when an image has none. */
  projectTitle: string;
  labels: { previous: string; next: string; goTo: string };
};

/**
 * Full image carousel, used only on a project's own page — listings show just
 * the cover.
 *
 * No dependency: a controlled index plus two buttons is the whole feature, and
 * it stays keyboard accessible for free. Starts on the cover, since that is the
 * image the editor chose to represent the project.
 *
 * Images go through `next/image`: the OCI Always Free tier allows 50k Object
 * Storage requests/month, and the Vercel edge cache keeps origin reads
 * negligible.
 */
export function ProjectCarousel({ images, projectTitle, labels }: Readonly<Props>) {
  const [index, setIndex] = useState(() => {
    const coverIndex = images.findIndex((image) => image.isCover);
    return coverIndex >= 0 ? coverIndex : 0;
  });

  if (images.length === 0) return null;

  const current = images[Math.min(index, images.length - 1)];
  const hasMany = images.length > 1;

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40">
        {/* No dimensions are stored, so a fixed aspect box plus `fill` is used. */}
        <div className="relative aspect-[16/9] w-full">
          <Image
            src={current.url}
            alt={current.alt ?? projectTitle}
            fill
            priority
            sizes="(min-width: 1024px) 60vw, 100vw"
            className="object-cover"
          />
        </div>

        {hasMany && (
          <>
            <button
              type="button"
              aria-label={labels.previous}
              onClick={() => setIndex((value) => (value - 1 + images.length) % images.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 px-3 py-2 text-lg text-white/80 transition hover:bg-black/80 hover:text-white"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label={labels.next}
              onClick={() => setIndex((value) => (value + 1) % images.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 px-3 py-2 text-lg text-white/80 transition hover:bg-black/80 hover:text-white"
            >
              ›
            </button>
          </>
        )}
      </div>

      {hasMany && (
        <div className="mt-3 flex flex-wrap gap-2">
          {images.map((image, thumbIndex) => (
            <button
              key={image.id}
              type="button"
              aria-label={`${labels.goTo} ${thumbIndex + 1}`}
              aria-current={thumbIndex === index ? 'true' : undefined}
              onClick={() => setIndex(thumbIndex)}
              className={
                thumbIndex === index
                  ? 'relative h-14 w-20 overflow-hidden rounded-lg border border-accent'
                  : 'relative h-14 w-20 overflow-hidden rounded-lg border border-white/15 opacity-60 transition hover:opacity-100'
              }
            >
              <Image src={image.url} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
