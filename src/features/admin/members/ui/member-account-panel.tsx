'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { UserRole } from '@prisma/client';
import { apiClient } from '@/shared/api/api-client';
import { generatePassword } from '@/shared/lib/generate-password';
import { isValidEmail } from '@/shared/lib/email';
import { checkPassword } from '@/shared/lib/password';
import { isPrivilegedRole, ROLE_LABELS, USER_ROLES } from '@/shared/lib/roles';
import { Button } from '@/shared/ui/button';
import { FormStatus } from '@/shared/ui/form-status';
import { SelectField } from '@/shared/ui/select-field';
import { TextField } from '@/shared/ui/text-field';
import { RoleBadge } from '@/features/admin/users/ui/role-badge';

export type LinkedAccount = {
  id: string;
  email: string;
  role: UserRole;
};

type Props = {
  memberId: string;
  account: LinkedAccount | null;
  canAssignPrivileged: boolean;
};

/**
 * Shows whether a member has a system account, and lets you create one later.
 *
 * The relation stays optional 1:1 — a member is a public team profile, which does
 * not require the ability to sign in.
 */
export function MemberAccountPanel({ memberId, account, canAssignPrivileged }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<string>('member');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleCreate() {
    if (!isValidEmail(email)) {
      setStatus('error');
      setMessage('Informe um e-mail válido.');
      return;
    }
    const passwordCheck = checkPassword(password);
    if (!passwordCheck.valid) {
      setStatus('error');
      setMessage('A senha precisa ter pelo menos 8 caracteres.');
      return;
    }

    setStatus('submitting');
    setMessage('');

    const result = await apiClient.post(`/api/admin/members/${memberId}/account`, {
      email: email.trim(),
      password,
      role,
    });

    if (!result.ok) {
      setStatus('error');
      setMessage(result.message);
      return;
    }

    setStatus('success');
    setMessage('Conta criada e vinculada ao membro.');
    router.refresh();
  }

  const roleOptions = USER_ROLES.map((value) => ({
    value,
    label: ROLE_LABELS[value],
    disabled: isPrivilegedRole(value) && !canAssignPrivileged,
  }));

  return (
    <section className="card-glow animate-fade-up delay-200 mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm">
      <h2 className="text-xs font-semibold uppercase tracking-[0.28em] text-white/40">
        Conta de sistema
      </h2>

      {account ? (
        <div className="mt-3">
          <p className="flex flex-wrap items-center gap-2 text-sm text-white/80">
            {account.email}
            <RoleBadge role={account.role} />
          </p>
          <Link
            href={`/admin/users/${account.id}/edit`}
            className="mt-3 inline-block text-xs uppercase tracking-[0.12em] text-white/40 transition hover:text-white"
          >
            Gerenciar conta →
          </Link>
        </div>
      ) : (
        <div className="mt-3">
          <p className="text-sm text-white/50">
            Este membro não tem conta e não consegue entrar no sistema.
          </p>

          {!isOpen ? (
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setIsOpen(true)}>
              Criar conta
            </Button>
          ) : (
            <div className="mt-4 space-y-4">
              <FormStatus status={status} message={message} />

              <TextField
                id="member-account-email"
                label="E-mail"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={status === 'submitting'}
                placeholder="pessoa@kiwibit.com.br"
              />

              <div>
                <TextField
                  id="member-account-password"
                  label="Senha"
                  type="text"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={status === 'submitting'}
                  placeholder="Mínimo 8 caracteres"
                  hint="Mostrada em texto para você poder copiar e repassar."
                />
                <button
                  type="button"
                  onClick={() => setPassword(generatePassword())}
                  className="mt-2 text-xs uppercase tracking-[0.12em] text-white/40 transition hover:text-white"
                >
                  Gerar senha
                </button>
              </div>

              <SelectField
                id="member-account-role"
                label="Função"
                required
                options={roleOptions}
                value={role}
                onChange={(event) => setRole(event.target.value)}
                disabled={status === 'submitting'}
                hint={
                  canAssignPrivileged
                    ? undefined
                    : 'Somente administradores podem atribuir funções privilegiadas.'
                }
              />

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => void handleCreate()}
                  isLoading={status === 'submitting'}
                  loadingLabel="Criando..."
                >
                  Criar conta
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={status === 'submitting'}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
