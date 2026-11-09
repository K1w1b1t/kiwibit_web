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
  titlePt?: string | null;
  titleEn?: string | null;
  descriptionPt?: string | null;
  descriptionEn?: string | null;
  isFeatured?: boolean;
  featuredOrder?: number;
};

type Props = { initial?: ProjectInitial };

function toFormValues(initial?: ProjectInitial): ProjectFormValues {
  return {
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    titlePt: initial?.titlePt ?? (initial?.titleEn ? '' : (initial?.title ?? '')),
    descriptionPt: initial?.descriptionPt ?? (initial?.titleEn ? '' : (initial?.description ?? '')),
    titleEn: initial?.titleEn ?? '',
    descriptionEn: initial?.descriptionEn ?? '',
    repoUrl: initial?.repoUrl ?? '',
    liveUrl: initial?.liveUrl ?? '',
    isFeatured: initial?.isFeatured ?? false,
    featuredOrder: initial?.featuredOrder ?? 1,
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

      <p className="mb-5 text-sm text-white/60">
        Preencha título e descrição em pelo menos um idioma. Sem tradução, o site usa a versão
        disponível. Os seis primeiros destaques aparecem na home; sem seleção, entram os projetos
        mais recentes.
      </p>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit(form);
        }}
        className="space-y-4"
      >
        {(['Pt', 'En'] as const).map((language) => (
          <fieldset key={language} className="space-y-4 rounded-xl border border-white/10 p-4">
            <legend>{language === 'Pt' ? 'Português' : 'Inglês'}</legend>
            {(['title', 'description'] as const).map((field) => (
              <TextAreaField
                key={field}
                id={`${idPrefix}-${field}-${language}`}
                label={field === 'title' ? 'Título' : 'Descrição'}
                rows={field === 'title' ? 1 : 6}
                value={form[`${field}${language}`] ?? ''}
                error={fieldErrors[`${field}${language}`]}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    [`${field}${language}`]: event.target.value,
                  }))
                }
                disabled={isSubmitting}
              />
            ))}
          </fieldset>
        ))}
        <label className="flex gap-3">
          <input
            type="checkbox"
            checked={form.isFeatured ?? false}
            disabled={isSubmitting}
            onChange={(event) =>
              setForm((current) => ({ ...current, isFeatured: event.target.checked }))
            }
          />
          <span>Destacar na home</span>
        </label>
        <TextField
          id={`${idPrefix}-order`}
          label="Ordem na home"
          type="number"
          min={1}
          value={String(form.featuredOrder ?? 1)}
          error={fieldErrors.featuredOrder}
          disabled={isSubmitting}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              featuredOrder: Number(event.target.value),
            }))
          }
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
