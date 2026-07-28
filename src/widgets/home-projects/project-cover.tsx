import Image from 'next/image';
import Link from 'next/link';
import type { HomeProjectImage } from '@/features/home/model/types';

type Props = {
  images: readonly HomeProjectImage[];
  projectTitle: string;
  /** Wraps the cover in a link to the project page. */
  href: string;
};

/**
 * Single cover image for a project card in a listing.
 *
 * Listings show ONLY the cover — the full carousel belongs to the project's own
 * page. Falls back to the first image when no cover flag is set, so a project
 * always renders something.
 *
 * Goes through `next/image`: the OCI Always Free tier allows 50k Object Storage
 * requests/month, and the Vercel edge cache is what keeps origin reads
 * negligible.
 */
export function ProjectCover({ images, projectTitle, href }: Props) {
  const cover = images.find((image) => image.isCover) ?? images[0];
  if (!cover) return null;

  return (
    <Link
      href={href}
      className="relative mb-4 block aspect-[16/9] w-full overflow-hidden rounded-xl border border-white/10 bg-black/40"
    >
      {/* No dimensions are stored, so a fixed aspect box plus `fill` is used. */}
      <Image
        src={cover.url}
        alt={cover.alt ?? projectTitle}
        fill
        sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
        className="object-cover transition duration-300 hover:scale-105"
      />
    </Link>
  );
}
