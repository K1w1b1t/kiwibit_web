'use client';
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { EmojiStyle } from 'emoji-picker-react';
import { ImageUploadField, type ImageValue } from './image-upload-field';
import { TextField } from './text-field';
import { isHttpUrl } from '@/shared/lib/url';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });
type Props = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
  postId?: string;
  onUploadingChange?: (busy: boolean) => void;
};
export function RichTextField({
  id,
  label,
  value,
  onChange,
  disabled,
  error,
  postId,
  onUploadingChange,
}: Readonly<Props>) {
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [panel, setPanel] = useState<'image' | 'emoji' | null>(null);
  const [image, setImage] = useState<ImageValue>({ url: '', path: '' });
  const [alt, setAlt] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState('');
  const [previewError, setPreviewError] = useState('');
  const input = useRef<HTMLTextAreaElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const selection = useRef({ start: 0, end: 0 });
  useEffect(() => {
    if (panel) dialog.current?.showModal();
    else dialog.current?.close();
  }, [panel]);
  useEffect(() => {
    if (tab !== 'preview') return;
    const controller = new AbortController();
    fetch('/api/admin/posts/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: value }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error();
        return res.json() as Promise<{ html: string }>;
      })
      .then((result) => {
        if (!controller.signal.aborted) setPreview(result.html);
      })
      .catch(() => {
        if (!controller.signal.aborted) setPreviewError('Não foi possível carregar a prévia.');
      });
    return () => controller.abort();
  }, [tab, value]);
  function insert(text: string) {
    const { start, end } = selection.current;
    onChange(value.slice(0, start) + text + value.slice(end));
    setPanel(null);
    setTab('edit');
    requestAnimationFrame(() => {
      input.current?.focus();
      input.current?.setSelectionRange(start + text.length, start + text.length);
    });
  }
  function open(next: 'image' | 'emoji') {
    selection.current = {
      start: input.current?.selectionStart ?? value.length,
      end: input.current?.selectionEnd ?? value.length,
    };
    setPanel(next);
  }
  const button =
    'rounded border border-white/20 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-40';
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      <div className="rounded-xl border border-white/20">
        <div
          role="tablist"
          aria-label={`${label}: edição e prévia`}
          className="flex flex-wrap gap-2 border-b border-white/10 p-3"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'edit'}
            className={button}
            onClick={() => setTab('edit')}
          >
            Editar
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'preview'}
            className={button}
            onClick={() => {
              if (tab !== 'preview') {
                setPreview('');
                setPreviewError('');
                setTab('preview');
              }
            }}
          >
            Prévia
          </button>
          <button
            type="button"
            className={button}
            disabled={disabled || tab !== 'edit'}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => open('image')}
          >
            Imagem
          </button>
          <button
            type="button"
            className={button}
            disabled={disabled || tab !== 'edit'}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => open('emoji')}
          >
            Emoji
          </button>
        </div>
        <textarea
          ref={input}
          id={id}
          hidden={tab !== 'edit'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          className="min-h-64 w-full resize-y bg-transparent p-4 font-mono text-sm outline-none"
          placeholder="Escreva em Markdown ou HTML"
        />
        {tab === 'preview' && (
          <div role="tabpanel" className="post-rich-content min-h-64 p-4">
            {previewError ? (
              <p role="alert">{previewError}</p>
            ) : (
              <div dangerouslySetInnerHTML={{ __html: preview }} />
            )}
          </div>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-amber-200">
          {error}
        </p>
      )}
      <dialog
        ref={dialog}
        aria-label={panel === 'image' ? 'Inserir imagem' : 'Escolher emoji'}
        onCancel={(event) => {
          event.preventDefault();
          if (!busy) setPanel(null);
        }}
        className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg space-y-4 overflow-auto rounded-xl border border-white/20 bg-zinc-950 p-5 text-white backdrop:bg-black/70"
      >
        {panel === 'image' && (
          <>
            <ImageUploadField
              id={`${id}-image`}
              label="Imagem no conteúdo"
              scope="posts"
              postId={postId}
              value={image}
              onChange={setImage}
              onUploadingChange={(next) => {
                setBusy(next);
                onUploadingChange?.(next);
              }}
            />
            <TextField
              id={`${id}-alt`}
              label="Texto alternativo"
              value={alt}
              onChange={(event) => setAlt(event.target.value)}
            />
            <button
              type="button"
              className={button}
              disabled={busy || !isHttpUrl(image.url)}
              onClick={() => {
                insert(
                  `![${alt.replace(/[\[\]\\]/g, '\\$&')}](${image.url.replace(/[()\s]/g, encodeURIComponent)})`,
                );
                setImage({ url: '', path: '' });
                setAlt('');
              }}
            >
              Inserir imagem
            </button>
          </>
        )}
        {panel === 'emoji' && (
          <EmojiPicker
            width="100%"
            emojiStyle={'native' as EmojiStyle}
            onEmojiClick={(emoji) => insert(emoji.emoji)}
          />
        )}
        <button type="button" className={button} disabled={busy} onClick={() => setPanel(null)}>
          Fechar
        </button>
      </dialog>
    </div>
  );
}
