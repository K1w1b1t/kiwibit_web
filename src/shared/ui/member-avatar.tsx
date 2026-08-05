'use client';

import { useState } from 'react';
import { cn } from '@/shared/lib/cn';

/** First letters of the first two name tokens, e.g. "Ada Lovelace" → "AL". */
export function getInitials(name: string): string {
  const tokens = name.trim().split(/\s+/);
  return tokens
    .slice(0, 2)
    .map((token) => token[0]?.toUpperCase() ?? '')
    .join('');
}

/**
 * A member's avatar. Renders a raw <img> on purpose: avatars are arbitrary
 * pasted URLs from any host, and `next/image` refuses hosts that are not in
 * `images.remotePatterns` (only the OCI bucket is allowlisted). Falls back to
 * the name initials when there is no URL or the image fails to load.
 *
 * `className` sizes the circle; `textClassName` sizes the initials.
 */
export function MemberAvatar({
  name,
  url,
  className,
  textClassName,
}: Readonly<{
  name: string;
  url: string | null;
  className?: string;
  textClassName?: string;
}>) {
  const [failed, setFailed] = useState(false);
  const trimmed = url?.trim() ?? '';
  const showImage = trimmed !== '' && !failed;

  return (
    <div
      className={cn(
        'flex items-center justify-center overflow-hidden rounded-full border border-white/20 bg-black text-white',
        className,
      )}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={trimmed}
          alt={name}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className={cn('font-semibold', textClassName)}>{getInitials(name)}</span>
      )}
    </div>
  );
}
