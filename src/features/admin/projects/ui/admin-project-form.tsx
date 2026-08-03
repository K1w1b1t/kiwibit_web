'use client';

import { useState } from 'react';
import {
  EMPTY_PROJECT_FIELD_ERRORS,
  validateProject,
  type ProjectFieldErrors,
  type ProjectFormValues,
} from '@/features/admin/projects/model/validate-project';
import {
  toCreateProjectPayload,
  toUpdateProjectPayload,
} from '@/features/admin/projects/model/project-payload';
import { useResourceForm } from '@/shared/hooks/use-resource-form';
import { Button } from '@/shared/ui/button';
import { FormStatus } from '@/shared/ui/form-status';
import { TextAreaField } from '@/shared/ui/text-area-field';
import { TextField } from '@/shared/ui/text-field';

export type ProjectInitial = {
  id: string;
  title: string;
  description: string;
  repoUrl: string | null;
  liveUrl: string | null;
};

type Props = { initial?: ProjectInitial };

function toFormValues(initial?: ProjectInitial): ProjectFormValues {
  return {
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    repoUrl: initial?.repoUrl ?? '',
    liveUrl: initial?.liveUrl ?? '',
  };
}

export function AdminProjectForm({ initial }: Readonly<Props>) {
  const isEdit = initial !== undefined;
  const [form, setForm] = useState<ProjectFormValues>(() => toFormValues(initial));

  const { status, message, fieldErrors, isSubmitting, submit } = useResourceForm<
    ProjectFormValues,
    unknown,
    ProjectFieldErrors
  >({
    validate: validateProject,
    toPayload: isEdit ? toUpdateProjectPayload : toCreateProjectPayload,
    method: isEdit ? 'PUT' : 'POST',
    endpoint: isEdit ? `/api/admin/projects/${initial.id}` : '/api/admin/projects',
    successMessage: isEdit ? 'Alterações salvas.' : 'Projeto criado com sucesso.',
    emptyFieldErrors: EMPTY_PROJECT_FIELD_ERRORS,
    onSuccess: isEdit ? undefined : () => setForm(toFormValues()),
  });

  function update<K extends keyof ProjectFormValues>(field: K, value: ProjectFormValues[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  const idPrefix = isEdit ? 'edit-project' : 'new-project';

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
          placeholder="Nome do projeto"
          error={fieldErrors.title}
          className="animate-fade-up delay-200"
        />

        <TextAreaField
          id={`${idPrefix}-description`}
          label="Descrição"
          required
          rows={6}
          value={form.description}
          onChange={(event) => update('description', event.target.value)}
          disabled={isSubmitting}
          placeholder="O que é o projeto e qual problema resolve"
          error={fieldErrors.description}
          className="animate-fade-up delay-300"
        />

        <TextField
          id={`${idPrefix}-repo`}
          label="Repositório"
          value={form.repoUrl}
          onChange={(event) => update('repoUrl', event.target.value)}
          disabled={isSubmitting}
          placeholder="https://github.com/..."
          error={fieldErrors.repoUrl}
          className="animate-fade-up delay-400"
        />

        <TextField
          id={`${idPrefix}-live`}
          label="URL pública"
          value={form.liveUrl}
          onChange={(event) => update('liveUrl', event.target.value)}
          disabled={isSubmitting}
          placeholder="https://..."
          error={fieldErrors.liveUrl}
          className="animate-fade-up delay-400"
        />

        <div className="animate-fade-up delay-500 pt-2">
          <Button
            type="submit"
            isLoading={isSubmitting}
            loadingLabel={isEdit ? 'Salvando...' : 'Criando...'}
          >
            {isEdit ? 'Salvar alterações' : 'Criar projeto'}
          </Button>
        </div>
      </form>
    </div>
  );
}
