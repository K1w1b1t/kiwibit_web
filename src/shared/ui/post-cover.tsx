import Image from 'next/image';

/**
 * Cover image for a blog post. A post must always show something in the cover
 * slot, so when no `url` is stored we fall back to a branded placeholder
 * (gradient + faded logo) instead of collapsing the layout.
 *
 * The parent controls the box shape via `className` (e.g. `aspect-[16/9]`);
 * the image fills it.
 */
export function PostCover({
  url,
  alt,
  sizes,
  className,
  priority,
}: Readonly<{
  url: string | null;
  alt: string;
  sizes?: string;
  className?: string;
  priority?: boolean;
}>) {
  return (
    <div className={`relative overflow-hidden bg-slate-900 ${className ?? ''}`}>
      {url ? (
        <Image
          src={url}
          alt={alt}
          fill
          sizes={sizes ?? '100vw'}
          className="object-cover"
          priority={priority}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-black">
          {/* Decorative fallback; the surrounding card already carries the title. */}
          <Image src="/kiwi.png" alt="" width={72} height={72} className="opacity-20" />
        </div>
      )}
    </div>
  );
}
