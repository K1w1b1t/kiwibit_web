'use client';
import { type Editor, useEditorState } from '@tiptap/react';

type Props = {
  editor: Editor | null;
  disabled: boolean;
  onPanel: (panel: 'link' | 'image' | 'emoji') => void;
};
export function RichTextToolbar({ editor, disabled, onPanel }: Readonly<Props>) {
  const active = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      heading: current?.getAttributes('heading').level as number | undefined,
      bold: current?.isActive('bold'),
      italic: current?.isActive('italic'),
      underline: current?.isActive('underline'),
      bulletList: current?.isActive('bulletList'),
      orderedList: current?.isActive('orderedList'),
      blockquote: current?.isActive('blockquote'),
    }),
  });

  const buttonClass =
    'rounded border border-white/20 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-40 aria-pressed:bg-white/20';
  return (
    <div
      role="toolbar"
      aria-label={'Formatação do conteúdo'}
      className="flex flex-wrap gap-2 border-b border-white/10 p-3"
    >
      <select
        aria-label="Estilo do parágrafo"
        disabled={disabled || !editor}
        className="rounded bg-zinc-900 p-2"
        onChange={(event) => {
          const level = Number(event.target.value);
          if (level)
            editor
              ?.chain()
              .focus()
              .setHeading({ level: level as 1 | 2 | 3 })
              .run();
          else editor?.chain().focus().setParagraph().run();
        }}
        value={active?.heading ?? 0}
      >
        <option value="0">Parágrafo</option>
        <option value="1">H1</option>
        <option value="2">H2</option>
        <option value="3">H3</option>
      </select>
      {(['bold', 'italic', 'underline', 'bulletList', 'orderedList', 'blockquote'] as const).map(
        (command, index) => (
          <button
            key={command}
            type="button"
            className={buttonClass}
            disabled={disabled || !editor}
            aria-pressed={active?.[command] ?? false}
            onClick={() => {
              const chain = editor?.chain().focus();
              if (command === 'bold') chain?.toggleBold().run();
              if (command === 'italic') chain?.toggleItalic().run();
              if (command === 'underline') chain?.toggleUnderline().run();
              if (command === 'bulletList') chain?.toggleBulletList().run();
              if (command === 'orderedList') chain?.toggleOrderedList().run();
              if (command === 'blockquote') chain?.toggleBlockquote().run();
            }}
          >
            {['Negrito', 'Itálico', 'Sublinhado', 'Lista', 'Lista numerada', 'Citação'][index]}
          </button>
        ),
      )}
      <button
        type="button"
        className={buttonClass}
        disabled={disabled || !editor}
        onClick={() => {
          onPanel('link');
        }}
      >
        Link
      </button>
      <button
        type="button"
        className={buttonClass}
        disabled={disabled || !editor}
        onClick={() => {
          onPanel('image');
        }}
      >
        Imagem
      </button>
      <button
        type="button"
        className={buttonClass}
        disabled={disabled || !editor}
        onClick={() => onPanel('emoji')}
      >
        Emoji
      </button>
      <button
        type="button"
        className={buttonClass}
        disabled={disabled || !editor}
        onClick={() => editor?.chain().focus().undo().run()}
      >
        Desfazer
      </button>
      <button
        type="button"
        className={buttonClass}
        disabled={disabled || !editor}
        onClick={() => editor?.chain().focus().redo().run()}
      >
        Refazer
      </button>
    </div>
  );
}
