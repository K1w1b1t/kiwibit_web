import { PostCover } from '@/shared/ui/post-cover';
import Link from 'next/link';
import type { HomeProjectImage } from '@/features/home/model/types';

type Props = {
  images: readonly HomeProjectImage[];
  projectTitle: string;
  /** Wraps the cover in a link to the project page. */
  href: string;
  showcase?: boolean;
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
export function ProjectCover({ images, projectTitle, href, showcase = false }: Readonly<Props>) {
  const cover = images.find((image) => image.isCover) ?? images[0];
  return (
    <Link href={href} className={showcase ? 'block overflow-hidden lg:h-full' : 'block'}>
      <PostCover
        url={cover?.url ?? null}
        alt={cover?.alt ?? projectTitle}
        sizes={
          showcase
            ? '(min-width: 1024px) 45vw, 90vw'
            : '(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw'
        }
        className={
          showcase
            ? 'aspect-video w-full lg:aspect-auto lg:h-full lg:min-h-96'
            : 'aspect-video w-full'
        }
      />
    </Link>
  );
}
