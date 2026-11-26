'use client';
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { EmojiStyle } from 'emoji-picker-react';
import { ImagePlus, Smile } from 'lucide-react';
import { Button } from './button';
import { ImageUploadField, type ImageValue } from './image-upload-field';
import { TextField } from './text-field';
import { TextPreviewField } from './text-preview-field';
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
  const [previewOpen, setPreviewOpen] = useState(false);
  const [panel, setPanel] = useState<'image' | 'emoji' | null>(null);
  const [image, setImage] = useState<ImageValue>({ url: '', path: '' });
  const [alt, setAlt] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<
    (({ html: string } | { error: string }) & { source: string }) | null
  >(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const selection = useRef({ start: 0, end: 0 });
  useEffect(() => {
    if (panel) dialog.current?.showModal();
    else dialog.current?.close();
  }, [panel]);
  useEffect(() => {
    if (!previewOpen) return;
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
        if (!controller.signal.aborted) setPreview({ ...result, source: value });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setPreview({ error: 'Não foi possível carregar a prévia.', source: value });
      });
    return () => controller.abort();
  }, [previewOpen, value]);
  function insert(text: string) {
    const { start, end } = selection.current;
    onChange(value.slice(0, start) + text + value.slice(end));
    setPanel(null);
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
  return (
    <>
      <TextPreviewField
        inputRef={input}
        id={id}
        label={label}
        value={value}
        onChange={onChange}
        disabled={disabled}
        error={error}
        placeholder="Escreva em Markdown ou HTML"
        variant="article"
        onPreviewChange={(next) => {
          setPreview(null);
          setPreviewOpen(next);
        }}
        toolbar={
          <div className="flex min-w-0 flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="min-h-10 gap-2"
              disabled={disabled}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => open('image')}
            >
              <ImagePlus aria-hidden size={18} className="shrink-0" />
              Inserir imagem no texto
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="min-h-10 gap-2"
              disabled={disabled}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => open('emoji')}
            >
              <Smile aria-hidden size={18} className="shrink-0" />
              Emoji
            </Button>
          </div>
        }
        preview={
          preview?.source !== value ? (
            <p role="status">Carregando prévia...</p>
          ) : 'error' in preview ? (
            <p role="alert">{preview.error}</p>
          ) : (
            <div className="post-rich-content" dangerouslySetInnerHTML={{ __html: preview.html }} />
          )
        }
      />
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
            <Button
              size="sm"
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
            </Button>
          </>
        )}
        {panel === 'emoji' && (
          <EmojiPicker
            width="100%"
            emojiStyle={'native' as EmojiStyle}
            onEmojiClick={(emoji) => insert(emoji.emoji)}
          />
        )}
        <Button variant="outline" size="sm" disabled={busy} onClick={() => setPanel(null)}>
          Fechar
        </Button>
      </dialog>
    </>
  );
}
