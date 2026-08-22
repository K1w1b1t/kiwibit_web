'use client';

import { useState } from 'react';
import {
  EMPTY_MEMBER_FIELD_ERRORS,
  validateMember,
  type MemberFieldErrors,
  type MemberFormValues,
} from '@/features/admin/members/model/validate-member';
import {
  toCreateMemberPayload,
  toUpdateMemberPayload,
} from '@/features/admin/members/model/member-payload';
import { useResourceForm } from '@/shared/hooks/use-resource-form';
import { Button } from '@/shared/ui/button';
import { FormStatus } from '@/shared/ui/form-status';
import { ImageUploadField } from '@/shared/ui/image-upload-field';
import { TextAreaField } from '@/shared/ui/text-area-field';
import { TextField } from '@/shared/ui/text-field';

export type MemberInitial = {
  id: string;
  name: string;
  bio: string | null;
  bioPt: string | null;
  bioEn: string | null;
  avatarUrl: string | null;
  avatarPath: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
};

type Props = {
  /** Absent means create; present means edit. */
  initial?: MemberInitial;
};

function toFormValues(initial?: MemberInitial): MemberFormValues {
  return {
    name: initial?.name ?? '',
    bio: initial?.bio ?? '',
    bioPt: initial?.bioPt ?? '',
    bioEn: initial?.bioEn ?? '',
    avatarUrl: initial?.avatarUrl ?? '',
    avatarPath: initial?.avatarPath ?? '',
    githubUrl: initial?.githubUrl ?? '',
    linkedinUrl: initial?.linkedinUrl ?? '',
  };
}

/**
 * One form for create and edit. The two used to be separate components that
 * were ~85% identical; the only real differences are the HTTP verb, the payload
 * shape (`undefined` vs `null` for cleared optionals) and the labels.
 */
export function AdminMemberForm({ initial }: Readonly<Props>) {
  const isEdit = initial !== undefined;
  const [form, setForm] = useState<MemberFormValues>(() => toFormValues(initial));

  const { status, message, fieldErrors, isSubmitting, submit } = useResourceForm<
    MemberFormValues,
    unknown,
    MemberFieldErrors
  >({
    validate: validateMember,
    toPayload: isEdit ? toUpdateMemberPayload : toCreateMemberPayload,
    method: isEdit ? 'PUT' : 'POST',
    endpoint: isEdit ? `/api/admin/members/${initial.id}` : '/api/admin/members',
    successMessage: isEdit ? 'Alterações salvas.' : 'Membro criado com sucesso.',
    emptyFieldErrors: EMPTY_MEMBER_FIELD_ERRORS,
    // Create clears the form for the next entry; edit keeps what was typed.
    onSuccess: isEdit ? undefined : () => setForm(toFormValues()),
  });

  function update<K extends keyof MemberFormValues>(field: K, value: MemberFormValues[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  const idPrefix = isEdit ? 'edit-member' : 'new-member';

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
          id={`${idPrefix}-name`}
          label="Nome"
          required
          value={form.name}
          onChange={(event) => update('name', event.target.value)}
          disabled={isSubmitting}
          placeholder="Nome completo"
          error={fieldErrors.name}
          className="animate-fade-up delay-200"
        />

        <TextAreaField
          id={`${idPrefix}-bio`}
          label="Bio"
          value={form.bio}
          onChange={(event) => update('bio', event.target.value)}
          disabled={isSubmitting}
          placeholder="Breve descrição sobre o membro"
          error={fieldErrors.bio}
          className="animate-fade-up delay-300"
        />

        <TextAreaField
          id={`${idPrefix}-bio-pt`}
          label="Bio em português"
          value={form.bioPt}
          onChange={(event) => update('bioPt', event.target.value)}
          disabled={isSubmitting}
          placeholder="Bio exibida em português"
          error={fieldErrors.bioPt}
          className="animate-fade-up delay-300"
        />

        <TextAreaField
          id={`${idPrefix}-bio-en`}
          label="Bio em inglês"
          value={form.bioEn}
          onChange={(event) => update('bioEn', event.target.value)}
          disabled={isSubmitting}
          placeholder="Bio displayed in English"
          error={fieldErrors.bioEn}
          className="animate-fade-up delay-300"
        />

        <div className="animate-fade-up delay-400">
          <ImageUploadField
            id={`${idPrefix}-avatar`}
            label="Avatar"
            scope="members"
            shape="avatar"
            disabled={isSubmitting}
            error={fieldErrors.avatarUrl}
            value={{ url: form.avatarUrl, path: form.avatarPath }}
            onChange={(next) =>
              setForm((current) => ({
                ...current,
                avatarUrl: next.url,
                avatarPath: next.path,
              }))
            }
          />
        </div>

        <div className="animate-fade-up delay-500 pt-2">
          <TextField
            id={`${idPrefix}-github`}
            label="GitHub"
            type="url"
            value={form.githubUrl}
            onChange={(event) => update('githubUrl', event.target.value)}
            disabled={isSubmitting}
            placeholder="https://github.com/usuario"
            error={fieldErrors.githubUrl}
          />
          <TextField
            id={`${idPrefix}-linkedin`}
            label="LinkedIn"
            type="url"
            value={form.linkedinUrl}
            onChange={(event) => update('linkedinUrl', event.target.value)}
            disabled={isSubmitting}
            placeholder="https://linkedin.com/in/usuario"
            error={fieldErrors.linkedinUrl}
            className="mt-4"
          />
        </div>

        <div className="animate-fade-up delay-500 pt-2">
          <Button
            type="submit"
            isLoading={isSubmitting}
            loadingLabel={isEdit ? 'Salvando...' : 'Criando...'}
          >
            {isEdit ? 'Salvar alterações' : 'Criar membro'}
          </Button>
        </div>
      </form>
    </div>
  );
}
