'use client';

import { useState } from 'react';
import { cn } from '@/shared/lib/cn';

type Props = {
  url: string;
  alt?: string;
  /** `avatar` is the 72px circle used by member forms. */
  shape?: 'avatar' | 'thumb' | 'wide';
  emptyLabel?: string;
};

const SHAPES = {
  avatar: 'h-[72px] w-[72px] rounded-full',
  thumb: 'h-16 w-16 rounded-xl',
  wide: 'aspect-[16/9] w-full rounded-xl',
} as const;

/**
 * Live preview for an image URL.
 *
 * Uses a raw <img> on purpose: previews must render arbitrary pasted URLs and
 * local `blob:` object URLs during an upload, and `next/image` refuses both
 * (remote hosts need `images.remotePatterns`, blob URLs are never allowed).
 * These screens are behind auth and not perf-sensitive.
 */
export function ImagePreview({
  url,
  alt = '',
  shape = 'avatar',
  emptyLabel = 'Sem imagem',
}: Props) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const trimmed = url.trim();
  const errored = failedUrl !== null && failedUrl === trimmed;

  if (!trimmed || errored) {
    return (
      <div
        className={cn(
          SHAPES[shape],
          'flex items-center justify-center border border-dashed border-white/15 text-center text-[10px] uppercase tracking-[0.14em] text-white/30',
        )}
      >
        {errored ? 'Falhou' : emptyLabel}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={trimmed}
      alt={alt}
      onError={() => setFailedUrl(trimmed)}
      className={cn(SHAPES[shape], 'border border-white/10 object-cover')}
    />
  );
}
