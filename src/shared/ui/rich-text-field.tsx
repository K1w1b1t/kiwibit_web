'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { EmojiStyle } from 'emoji-picker-react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { RichTextToolbar } from './rich-text-toolbar';
import { ImageUploadField, type ImageValue } from './image-upload-field';
import { TextField } from './text-field';
import { isHttpUrl } from '@/shared/lib/url';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });
type Props = {
  id: string;
  label: string;
  value: string;
  onChange: (html: string) => void;
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
  disabled = false,
  error,
  postId,
  onUploadingChange,
}: Readonly<Props>) {
  const [panel, setPanel] = useState<'link' | 'image' | 'emoji' | null>(null);
  const [url, setUrl] = useState('');
  const [image, setImage] = useState<ImageValue>({ url: '', path: '' });
  const [alt, setAlt] = useState('');
  const [problem, setProblem] = useState('');
  const [uploading, setUploading] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        code: false,
        codeBlock: false,
        strike: false,
        horizontalRule: false,
        link: { openOnClick: false, protocols: ['http', 'https', 'mailto'] },
      }),
      Image.configure({ allowBase64: false }),
    ],
    content: value,
    immediatelyRender: false,
    editable: !disabled,
    onUpdate: ({ editor: current }) => onChange(current.getHTML()),
    editorProps: {
      attributes: {
        id,
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-labelledby': `${id}-label`,
        class: 'post-rich-content min-h-64 p-4 outline-none',
      },
    },
  });
  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);
  useEffect(() => {
    if (editor && editor.getHTML() !== value)
      editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);
  useEffect(() => {
    if (panel) dialog.current?.showModal();
    else dialog.current?.close();
  }, [panel]);
  function close() {
    if (!uploading) {
      setPanel(null);
      editor?.commands.focus();
    }
  }
  const buttonClass =
    'rounded border border-white/20 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-40 aria-pressed:bg-white/20';
  return (
    <div className="space-y-2">
      <span id={`${id}-label`} className="block text-sm font-semibold">
        {label}
      </span>
      <div className="rounded-xl border border-white/20">
        <RichTextToolbar
          editor={editor}
          disabled={disabled}
          onPanel={(next) => {
            setProblem('');
            if (next === 'link') setUrl(String(editor?.getAttributes('link').href ?? ''));
            if (next === 'image') {
              setImage({ url: '', path: '' });
              setAlt('');
            }
            setPanel(next);
          }}
        />
        <EditorContent editor={editor} />
      </div>
      {error && (
        <p role="alert" className="text-sm text-amber-200">
          {error}
        </p>
      )}
      <dialog
        ref={dialog}
        aria-label={
          panel === 'image' ? 'Inserir imagem' : panel === 'link' ? 'Editar link' : 'Escolher emoji'
        }
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg space-y-4 overflow-auto rounded-xl border border-white/20 bg-zinc-950 p-5 text-white backdrop:bg-black/70"
      >
        {panel === 'link' && (
          <>
            <TextField
              id={`${id}-link`}
              label="URL do link"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />
            <button
              type="button"
              className={buttonClass}
              onClick={() => {
                if (!isHttpUrl(url) && !/^mailto:[^\s<>]+$/.test(url)) {
                  setProblem('Use uma URL http/https ou mailto válida.');
                  return;
                }
                editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
                close();
              }}
            >
              Aplicar link
            </button>
            <button
              type="button"
              className={buttonClass}
              onClick={() => {
                editor?.chain().focus().extendMarkRange('link').unsetLink().run();
                close();
              }}
            >
              Remover link
            </button>
          </>
        )}
        {panel === 'image' && (
          <>
            <ImageUploadField
              id={`${id}-image`}
              label="Imagem no conteúdo"
              scope="posts"
              postId={postId}
              value={image}
              onChange={setImage}
              onUploadingChange={(busy) => {
                setUploading(busy);
                onUploadingChange?.(busy);
              }}
            />
            <TextField
              id={`${id}-image-alt`}
              label="Texto alternativo"
              value={alt}
              onChange={(event) => setAlt(event.target.value)}
            />
            <button
              type="button"
              className={buttonClass}
              disabled={uploading}
              onClick={() => {
                if (!isHttpUrl(image.url)) {
                  setProblem('Informe uma URL http/https válida.');
                  return;
                }
                editor?.chain().focus().setImage({ src: image.url, alt }).run();
                close();
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
            onEmojiClick={(emoji) => {
              editor?.chain().focus().insertContent(emoji.emoji).run();
              close();
            }}
          />
        )}
        {problem && (
          <p role="alert" className="text-amber-200">
            {problem}
          </p>
        )}
        <button type="button" className={buttonClass} disabled={uploading} onClick={close}>
          Fechar
        </button>
      </dialog>
    </div>
  );
}
