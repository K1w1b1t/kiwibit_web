'use client';

import { useState } from 'react';
import { apiClient } from '@/shared/api/api-client';
import { uploadImage } from '@/shared/api/upload-file';
import { checkImageFile, ALLOWED_IMAGE_TYPES } from '@/shared/lib/validate-image-file';
import { FormStatus } from '@/shared/ui/form-status';
import {
  moveImageDown,
  moveImageUp,
  removeImage,
  setCoverImage,
  sortImages,
  toOrderPayload,
  type GalleryImage,
} from '@/features/admin/projects/model/reorder-images';
import { ProjectGalleryItem } from './project-gallery-item';

type Props = {
  projectId: string;
  initialImages: readonly GalleryImage[];
};

const MAX_IMAGES = 24;

/**
 * Add / delete / reorder / pick-cover for a project's carousel.
 *
 * Reordering is ↑/↓ buttons, not drag-and-drop: no dnd library is a dependency,
 * the ordering logic stays in a pure, fully tested helper, and keyboard users get
 * it for free.
 *
 * Every mutation applies optimistically and rolls back to the previous array if
 * the request fails — which is why `reorder-images` never mutates in place.
 */
export function ProjectGalleryManager({ projectId, initialImages }: Props) {
  const [images, setImages] = useState<GalleryImage[]>(() => sortImages(initialImages));
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  function fail(text: string, rollback: GalleryImage[]) {
    setImages(rollback);
    setStatus('error');
    setMessage(text);
  }

  async function persistOrder(next: GalleryImage[], previous: GalleryImage[]) {
    setImages(next);
    setStatus('submitting');
    setMessage('');

    const result = await apiClient.put<GalleryImage[]>(
      `/api/admin/projects/${projectId}/images/order`,
      toOrderPayload(next),
    );

    if (!result.ok) {
      fail(result.message, previous);
      return;
    }

    setImages(sortImages(result.data));
    setStatus('idle');
  }

  async function handleUpload(file: File) {
    if (images.length >= MAX_IMAGES) {
      setStatus('error');
      setMessage(`Máximo de ${MAX_IMAGES} imagens por projeto.`);
      return;
    }

    const check = checkImageFile({ type: file.type, size: file.size });
    if (!check.valid) {
      setStatus('error');
      setMessage(check.message);
      return;
    }

    setStatus('submitting');
    setMessage('');

    const uploaded = await uploadImage(file, 'projects');
    if (!uploaded.ok) {
      setStatus('error');
      setMessage(uploaded.message);
      return;
    }

    const created = await apiClient.post<GalleryImage>(`/api/admin/projects/${projectId}/images`, {
      url: uploaded.data.url,
      storagePath: uploaded.data.path,
    });

    if (!created.ok) {
      setStatus('error');
      setMessage(created.message);
      return;
    }

    setImages((current) => sortImages([...current, created.data]));
    setStatus('success');
    setMessage('Imagem adicionada.');
  }

  async function handleSetCover(id: string) {
    const previous = images;
    setImages(setCoverImage(images, id));
    setBusyId(id);

    const result = await apiClient.put<GalleryImage[]>(
      `/api/admin/projects/${projectId}/images/${id}`,
      { isCover: true },
    );

    setBusyId(null);
    if (!result.ok) {
      fail(result.message, previous);
      return;
    }
    setImages(sortImages(result.data));
  }

  async function handleDelete(id: string) {
    const previous = images;
    setImages(removeImage(images, id));
    setBusyId(id);

    const result = await apiClient.delete<GalleryImage[]>(
      `/api/admin/projects/${projectId}/images/${id}`,
    );

    setBusyId(null);
    if (!result.ok) {
      fail(result.message, previous);
      return;
    }
    setImages(sortImages(result.data));
  }

  const isBusy = status === 'submitting' || busyId !== null;

  return (
    <section className="card-glow animate-fade-up delay-200 mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm">
      <header className="mb-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.28em] text-white/40">
          Carrossel de imagens
        </h2>
        <p className="mt-2 text-sm text-white/50">
          A imagem marcada como capa é a que aparece na listagem pública. Use ↑ e ↓ para mudar a
          ordem de exibição.
        </p>
      </header>

      <FormStatus status={status} message={message} />

      <div className="mb-5">
        <input
          id="project-gallery-upload"
          type="file"
          accept={ALLOWED_IMAGE_TYPES.join(',')}
          disabled={isBusy || images.length >= MAX_IMAGES}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleUpload(file);
            event.target.value = '';
          }}
          className="text-xs text-white/50 file:mr-3 file:rounded-full file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-xs file:uppercase file:tracking-[0.12em] file:text-white hover:file:bg-white/20 disabled:opacity-50"
        />
        <p className="mt-1 text-xs text-white/35">
          {images.length} de {MAX_IMAGES} imagens.
        </p>
      </div>

      {images.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-white/40">
          Nenhuma imagem ainda. A primeira que você subir vira a capa.
        </p>
      ) : (
        <ul className="space-y-3">
          {images.map((image, index) => (
            <ProjectGalleryItem
              key={image.id}
              image={image}
              isFirst={index === 0}
              isLast={index === images.length - 1}
              isBusy={isBusy}
              onMoveUp={() => void persistOrder(moveImageUp(images, image.id), images)}
              onMoveDown={() => void persistOrder(moveImageDown(images, image.id), images)}
              onSetCover={() => void handleSetCover(image.id)}
              onDelete={() => void handleDelete(image.id)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
