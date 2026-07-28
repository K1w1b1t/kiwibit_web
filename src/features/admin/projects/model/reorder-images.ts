export type GalleryImage = {
  id: string;
  url: string;
  alt: string | null;
  position: number;
  isCover: boolean;
};

/**
 * Pure gallery operations.
 *
 * All of them return a NEW array with dense 0-based positions. Nothing mutates
 * in place — React Compiler is enabled, and the manager applies these
 * optimistically before the request resolves, so it must be able to roll back to
 * the previous array.
 */
function renumber(images: readonly GalleryImage[]): GalleryImage[] {
  return images.map((image, index) => ({ ...image, position: index }));
}

/** Sorted by position, with createdAt-independent stability via the given order. */
export function sortImages(images: readonly GalleryImage[]): GalleryImage[] {
  return [...images].sort((a, b) => a.position - b.position);
}

/** No-op at index 0 — the first image cannot move up. */
export function moveImageUp(images: readonly GalleryImage[], id: string): GalleryImage[] {
  const index = images.findIndex((image) => image.id === id);
  if (index <= 0) return renumber(images);

  const next = [...images];
  [next[index - 1], next[index]] = [next[index], next[index - 1]];
  return renumber(next);
}

/** No-op at the last index — the last image cannot move down. */
export function moveImageDown(images: readonly GalleryImage[], id: string): GalleryImage[] {
  const index = images.findIndex((image) => image.id === id);
  if (index === -1 || index >= images.length - 1) return renumber(images);

  const next = [...images];
  [next[index], next[index + 1]] = [next[index + 1], next[index]];
  return renumber(next);
}

/** Exactly one cover afterwards; unknown ids leave the list unchanged. */
export function setCoverImage(images: readonly GalleryImage[], id: string): GalleryImage[] {
  if (!images.some((image) => image.id === id)) return renumber(images);
  return renumber(images).map((image) => ({ ...image, isCover: image.id === id }));
}

/**
 * Removes an image, compacts positions and promotes a new cover when the removed
 * one was the cover — otherwise the project would render no image at all.
 */
export function removeImage(images: readonly GalleryImage[], id: string): GalleryImage[] {
  const removed = images.find((image) => image.id === id);
  const remaining = renumber(images.filter((image) => image.id !== id));

  if (!removed?.isCover || remaining.length === 0) return remaining;

  return remaining.map((image, index) => ({ ...image, isCover: index === 0 }));
}

/** Payload for `PUT /api/admin/projects/[id]/images/order`. */
export function toOrderPayload(images: readonly GalleryImage[]): { ids: string[] } {
  return { ids: sortImages(images).map((image) => image.id) };
}
