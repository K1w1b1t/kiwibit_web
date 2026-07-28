'use client';

import { useState } from 'react';
import type { PostStatus } from '@prisma/client';
import {
  EMPTY_POST_FIELD_ERRORS,
  validatePost,
  type PostFieldErrors,
  type PostFormValues,
} from '@/features/admin/posts/model/validate-post';
import {
  toCreatePostPayload,
  toUpdatePostPayload,
} from '@/features/admin/posts/model/post-payload';
import { useResourceForm } from '@/shared/hooks/use-resource-form';
import { POST_STATUS_LABELS, POST_STATUSES } from '@/shared/lib/post-status';
import { Button } from '@/shared/ui/button';
import { FormStatus } from '@/shared/ui/form-status';
import { ImageUploadField } from '@/shared/ui/image-upload-field';
import { SelectField } from '@/shared/ui/select-field';
import { TextAreaField } from '@/shared/ui/text-area-field';
import { TextField } from '@/shared/ui/text-field';

export type PostInitial = {
  id: string;
  title: string;
  content: string;
  status: PostStatus;
  coverImageUrl: string | null;
  coverImagePath: string | null;
  coverImageAlt: string | null;
};

type Props = { initial?: PostInitial };

function toFormValues(initial?: PostInitial): PostFormValues {
  return {
    title: initial?.title ?? '',
    content: initial?.content ?? '',
    // New posts start as drafts so nothing goes live by accident.
    status: initial?.status ?? 'draft',
    coverImageUrl: initial?.coverImageUrl ?? '',
    coverImagePath: initial?.coverImagePath ?? '',
    coverImageAlt: initial?.coverImageAlt ?? '',
  };
}

const STATUS_OPTIONS = POST_STATUSES.map((status) => ({
  value: status,
  label: POST_STATUS_LABELS[status],
}));

export function AdminPostForm({ initial }: Props) {
  const isEdit = initial !== undefined;
  const [form, setForm] = useState<PostFormValues>(() => toFormValues(initial));

  const { status, message, fieldErrors, isSubmitting, submit } = useResourceForm<
    PostFormValues,
    unknown,
    PostFieldErrors
  >({
    validate: validatePost,
    toPayload: (values) =>
      isEdit
        ? toUpdatePostPayload(values as PostFormValues & { status: PostStatus })
        : toCreatePostPayload(values as PostFormValues & { status: PostStatus }),
    method: isEdit ? 'PUT' : 'POST',
    endpoint: isEdit ? `/api/admin/posts/${initial.id}` : '/api/admin/posts',
    successMessage: isEdit ? 'Alterações salvas.' : 'Post criado com sucesso.',
    emptyFieldErrors: EMPTY_POST_FIELD_ERRORS,
    onSuccess: isEdit ? undefined : () => setForm(toFormValues()),
  });

  function update<K extends keyof PostFormValues>(field: K, value: PostFormValues[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  const idPrefix = isEdit ? 'edit-post' : 'new-post';

  return (
    <div className="card-glow animate-fade-up delay-100 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm">
      <FormStatus status={status} message={message} />

      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit(form);
        }}
        className="space-y-4"
      >
        <TextField
          id={`${idPrefix}-title`}
          label="Título"
          required
          value={form.title}
          onChange={(event) => update('title', event.target.value)}
          disabled={isSubmitting}
          error={fieldErrors.title}
          className="animate-fade-up delay-200"
        />

        <SelectField
          id={`${idPrefix}-status`}
          label="Status"
          required
          options={STATUS_OPTIONS}
          value={form.status}
          onChange={(event) => update('status', event.target.value)}
          disabled={isSubmitting}
          error={fieldErrors.status}
          hint="Rascunho não aparece no blog público."
          className="animate-fade-up delay-200"
        />

        <TextAreaField
          id={`${idPrefix}-content`}
          label="Conteúdo"
          required
          rows={14}
          value={form.content}
          onChange={(event) => update('content', event.target.value)}
          disabled={isSubmitting}
          error={fieldErrors.content}
          className="animate-fade-up delay-300"
        />

        <div className="animate-fade-up delay-400 space-y-3">
          <ImageUploadField
            id={`${idPrefix}-cover`}
            label="Imagem de capa"
            scope="posts"
            shape="wide"
            disabled={isSubmitting}
            error={fieldErrors.coverImageUrl}
            value={{ url: form.coverImageUrl, path: form.coverImagePath }}
            onChange={(next) =>
              setForm((current) => ({
                ...current,
                coverImageUrl: next.url,
                coverImagePath: next.path,
              }))
            }
          />

          <TextField
            id={`${idPrefix}-cover-alt`}
            label="Texto alternativo da capa"
            value={form.coverImageAlt}
            onChange={(event) => update('coverImageAlt', event.target.value)}
            disabled={isSubmitting}
            placeholder="Descreva a imagem para leitores de tela"
            error={fieldErrors.coverImageAlt}
          />
        </div>

        <div className="animate-fade-up delay-500 pt-2">
          <Button
            type="submit"
            isLoading={isSubmitting}
            loadingLabel={isEdit ? 'Salvando...' : 'Criando...'}
          >
            {isEdit ? 'Salvar alterações' : 'Criar post'}
          </Button>
        </div>
      </form>
    </div>
  );
}
