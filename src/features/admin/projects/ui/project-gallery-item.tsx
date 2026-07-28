'use client';

import type { GalleryImage } from '@/features/admin/projects/model/reorder-images';
import { ImagePreview } from '@/shared/ui/image-preview';

type Props = {
  image: GalleryImage;
  isFirst: boolean;
  isLast: boolean;
  isBusy: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onSetCover: () => void;
  onDelete: () => void;
};

const ARROW =
  'rounded-full border border-white/15 px-2 py-1 text-xs text-white/60 transition hover:border-white/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-25';

export function ProjectGalleryItem({
  image,
  isFirst,
  isLast,
  isBusy,
  onMoveUp,
  onMoveDown,
  onSetCover,
  onDelete,
}: Props) {
  return (
    <li className="flex items-center gap-4 rounded-xl border border-white/10 bg-black/30 p-3">
      <ImagePreview url={image.url} alt={image.alt ?? ''} shape="thumb" />

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-white/40">
          Posição {image.position + 1}
          {image.isCover && <span className="text-accent">· Capa</span>}
        </p>
        <p className="mt-1 truncate text-xs text-white/30">{image.url}</p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={isBusy || isFirst}
          aria-label="Mover para cima"
          className={ARROW}
        >
          ↑
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={isBusy || isLast}
          aria-label="Mover para baixo"
          className={ARROW}
        >
          ↓
        </button>

        {!image.isCover && (
          <button
            type="button"
            onClick={onSetCover}
            disabled={isBusy}
            className="text-xs uppercase tracking-[0.12em] text-white/40 transition hover:text-white disabled:opacity-30"
          >
            Definir capa
          </button>
        )}

        <button
          type="button"
          onClick={onDelete}
          disabled={isBusy}
          className="text-xs uppercase tracking-[0.12em] text-red-300/70 transition hover:text-red-200 disabled:opacity-30"
        >
          Excluir
        </button>
      </div>
    </li>
  );
}
