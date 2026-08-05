'use client';

import { useState } from 'react';
import type { UserRole } from '@prisma/client';
import {
  EMPTY_USER_FIELD_ERRORS,
  validateUser,
  type UserFieldErrors,
  type UserFormValues,
} from '@/features/admin/users/model/validate-user';
import {
  toCreateUserPayload,
  toUpdateUserPayload,
} from '@/features/admin/users/model/user-payload';
import { useResourceForm } from '@/shared/hooks/use-resource-form';
import { generatePassword } from '@/shared/lib/generate-password';
import { isPrivilegedRole, ROLE_LABELS, USER_ROLES } from '@/shared/lib/roles';
import { Button } from '@/shared/ui/button';
import { FormStatus } from '@/shared/ui/form-status';
import { SelectField } from '@/shared/ui/select-field';
import { TextField } from '@/shared/ui/text-field';

export type UserInitial = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

type Props = {
  /** Absent means create. */
  initial?: UserInitial;
  /**
   * Whether the operator may assign admin/editor/member_manager. Mirrors the
   * 403 the server returns, so the UI does not offer what will be rejected.
   */
  canAssignPrivileged: boolean;
};

function toFormValues(initial?: UserInitial): UserFormValues {
  return {
    name: initial?.name ?? '',
    email: initial?.email ?? '',
    role: initial?.role ?? 'member',
    password: '',
  };
}

export function AdminUserForm({ initial, canAssignPrivileged }: Readonly<Props>) {
  const isEdit = initial !== undefined;
  const [form, setForm] = useState<UserFormValues>(() => toFormValues(initial));
  const [revealPassword, setRevealPassword] = useState(false);

  const { status, message, fieldErrors, isSubmitting, submit } = useResourceForm<
    UserFormValues,
    unknown,
    UserFieldErrors
  >({
    validate: (values) => validateUser(values, { requirePassword: !isEdit }),
    // The validator narrows `role`, so the payload builders receive a UserRole.
    toPayload: (values) =>
      isEdit
        ? toUpdateUserPayload(values as UserFormValues & { role: UserRole })
        : toCreateUserPayload(values as UserFormValues & { role: UserRole }),
    method: isEdit ? 'PUT' : 'POST',
    endpoint: isEdit ? `/api/admin/users/${initial.id}` : '/api/admin/users',
    successMessage: isEdit ? 'Alterações salvas.' : 'Usuário criado com sucesso.',
    emptyFieldErrors: EMPTY_USER_FIELD_ERRORS,
    onSuccess: () => setForm((current) => ({ ...current, password: '' })),
  });

  function update<K extends keyof UserFormValues>(field: K, value: UserFormValues[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  const roleOptions = USER_ROLES.map((role) => ({
    value: role,
    label: ROLE_LABELS[role],
    disabled: isPrivilegedRole(role) && !canAssignPrivileged,
  }));

  const idPrefix = isEdit ? 'edit-user' : 'new-user';

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

        <TextField
          id={`${idPrefix}-email`}
          label="E-mail"
          type="email"
          required
          value={form.email}
          onChange={(event) => update('email', event.target.value)}
          disabled={isSubmitting}
          placeholder="pessoa@kiwibit.com.br"
          error={fieldErrors.email}
          hint="Usado para entrar no sistema. Precisa ser único."
          className="animate-fade-up delay-300"
        />

        <SelectField
          id={`${idPrefix}-role`}
          label="Função"
          required
          options={roleOptions}
          value={form.role}
          onChange={(event) => update('role', event.target.value)}
          disabled={isSubmitting}
          error={fieldErrors.role}
          hint={
            canAssignPrivileged
              ? undefined
              : 'Somente administradores podem atribuir funções privilegiadas.'
          }
          className="animate-fade-up delay-400"
        />

        <div className="animate-fade-up delay-400">
          <TextField
            id={`${idPrefix}-password`}
            label={isEdit ? 'Nova senha' : 'Senha'}
            type={revealPassword ? 'text' : 'password'}
            required={!isEdit}
            value={form.password}
            onChange={(event) => update('password', event.target.value)}
            disabled={isSubmitting}
            autoComplete="new-password"
            placeholder={isEdit ? 'Deixe vazio para manter a atual' : 'Mínimo 8 caracteres'}
            error={fieldErrors.password}
          />
          <div className="mt-2 flex gap-3 text-xs">
            <button
              type="button"
              onClick={() => update('password', generatePassword())}
              className="uppercase tracking-[0.12em] text-white/40 transition hover:text-white"
            >
              Gerar senha
            </button>
            <button
              type="button"
              onClick={() => setRevealPassword((current) => !current)}
              className="uppercase tracking-[0.12em] text-white/40 transition hover:text-white"
            >
              {revealPassword ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
        </div>

        <div className="animate-fade-up delay-500 pt-2">
          <Button
            type="submit"
            isLoading={isSubmitting}
            loadingLabel={isEdit ? 'Salvando...' : 'Criando...'}
          >
            {isEdit ? 'Salvar alterações' : 'Criar usuário'}
          </Button>
        </div>
      </form>
    </div>
  );
}
