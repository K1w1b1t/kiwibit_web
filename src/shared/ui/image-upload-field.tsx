'use client';

import { useRef, useState } from 'react';
import { uploadImage } from '@/shared/api/upload-file';
import {
  ALLOWED_IMAGE_TYPES,
  checkImageFile,
  type UploadScope,
} from '@/shared/lib/validate-image-file';
import { FIELD_HINT_CLASS, FIELD_LABEL_CLASS } from '@/shared/ui/field-classes';
import { ImagePreview } from '@/shared/ui/image-preview';
import { TextField } from '@/shared/ui/text-field';

export type ImageValue = {
  url: string;
  /** Bucket key; empty when the URL is externally hosted. */
  path: string;
};

type Props = {
  id: string;
  label: string;
  scope: UploadScope;
  value: ImageValue;
  onChange: (value: ImageValue) => void;
  disabled?: boolean;
  error?: string;
  shape?: 'avatar' | 'thumb' | 'wide';
};

/**
 * Upload an image, or paste a URL.
 *
 * Both modes are kept on purpose: legacy member avatars point at arbitrary
 * external hosts, and pasting remains the escape hatch when storage is not
 * configured for the environment. A pasted URL has an empty `path`, which is how
 * the delete logic knows not to try removing it from our bucket.
 */
export function ImageUploadField({
  id,
  label,
  scope,
  value,
  onChange,
  disabled = false,
  error,
  shape = 'wide',
}: Readonly<Props>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  async function handleFile(file: File) {
    const check = checkImageFile({ type: file.type, size: file.size });
    if (!check.valid) {
      setUploadError(check.message);
      return;
    }

    setUploadError('');
    setIsUploading(true);

    const result = await uploadImage(file, scope);

    setIsUploading(false);
    if (!result.ok) {
      setUploadError(result.message);
      return;
    }

    onChange({ url: result.data.url, path: result.data.path });
  }

  return (
    <div>
      <span className={FIELD_LABEL_CLASS}>{label}</span>

      <div className="mb-3">
        <ImagePreview url={value.url} shape={shape} emptyLabel="Sem imagem" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={ALLOWED_IMAGE_TYPES.join(',')}
          disabled={disabled || isUploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
            // Allows re-picking the same file after an error.
            event.target.value = '';
          }}
          className="text-xs text-white/50 file:mr-3 file:rounded-full file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-xs file:uppercase file:tracking-[0.12em] file:text-white hover:file:bg-white/20 disabled:opacity-50"
        />

        {value.url && (
          <button
            type="button"
            disabled={disabled || isUploading}
            onClick={() => onChange({ url: '', path: '' })}
            className="text-xs uppercase tracking-[0.12em] text-red-300/70 transition hover:text-red-200"
          >
            Remover
          </button>
        )}
      </div>

      {isUploading && (
        <p aria-live="polite" className={FIELD_HINT_CLASS}>
          Enviando...
        </p>
      )}

      {(uploadError || error) && (
        <p role="alert" className="mt-1 text-xs text-amber-300">
          {uploadError || error}
        </p>
      )}

      <div className="mt-3">
        <TextField
          id={`${id}-url`}
          label="Ou cole uma URL"
          value={value.url}
          disabled={disabled || isUploading}
          placeholder="https://..."
          // A hand-typed URL is not ours, so it carries no bucket key.
          onChange={(event) => onChange({ url: event.target.value, path: '' })}
        />
      </div>
    </div>
  );
}
