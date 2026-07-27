'use client';

import { useState } from 'react';
import {
  validateMember,
  type MemberFormValues,
} from '@/features/admin/members/model/validate-member';
import { AvatarPreview } from '@/features/admin/members/ui/avatar-preview';

type FormStatus = 'idle' | 'loading' | 'success' | 'error';

type MemberInitial = {
  id: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
};

function toFormValues(initial: MemberInitial): MemberFormValues {
  return {
    name: initial.name,
    bio: initial.bio ?? '',
    avatarUrl: initial.avatarUrl ?? '',
  };
}

export function AdminMemberEditForm({ initial }: { initial: MemberInitial }) {
  const [form, setForm] = useState<MemberFormValues>(toFormValues(initial));
  const [status, setStatus] = useState<FormStatus>('idle');
  const [message, setMessage] = useState('');

  const isLoading = status === 'loading';
  const shortId = initial.id.slice(0, 8);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const validationError = validateMember(form);
    if (validationError) {
      setStatus('error');
      setMessage(validationError);
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch(`/api/admin/members/${initial.id}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          bio: form.bio.trim() || null,
          avatarUrl: form.avatarUrl.trim() || null,
        }),
      });

      const data = (await response.json()) as {
        success?: boolean;
        error?: { message: string };
      };

      if (!response.ok) {
        setStatus('error');
        setMessage(data.error?.message ?? 'Erro ao salvar membro.');
        return;
      }

      setStatus('success');
      setMessage('Alterações salvas.');
      // permanece na página; mantém os valores editados (não reseta)
    } catch {
      setStatus('error');
      setMessage('Erro de conexão. Tente novamente.');
    }
  }

  return (
    <div className="architectural-grid relative flex min-h-screen items-center justify-center bg-[#050505] px-6 py-16 text-white sm:px-10 lg:px-16">
      {/* cantos de registro (decorativos) */}
      <span
        aria-hidden="true"
        style={{ animationDelay: '0.5s' }}
        className="boot-line pointer-events-none absolute left-5 top-5 h-[18px] w-[18px] border-l border-t border-white/15"
      />
      <span
        aria-hidden="true"
        style={{ animationDelay: '0.5s' }}
        className="boot-line pointer-events-none absolute right-5 top-5 h-[18px] w-[18px] border-r border-t border-white/15"
      />
      <span
        aria-hidden="true"
        style={{ animationDelay: '0.5s' }}
        className="boot-line pointer-events-none absolute bottom-5 left-5 h-[18px] w-[18px] border-b border-l border-white/15"
      />
      <span
        aria-hidden="true"
        style={{ animationDelay: '0.5s' }}
        className="boot-line pointer-events-none absolute bottom-5 right-5 h-[18px] w-[18px] border-b border-r border-white/15"
      />

      <div className="w-full max-w-xl">
        <div className="animate-fade-up mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/40">Admin</p>
          <h1 className="mt-2 text-4xl font-black uppercase tracking-[-0.03em]">Editar Membro</h1>
          <div className="mt-3 h-px w-12 bg-white/20" />
          <p className="mt-3 text-sm text-white/40">
            Atualize os dados do membro. As alterações são salvas na hora.
          </p>
        </div>

        <div className="card-glow animate-fade-up delay-100 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm">
          {status === 'success' && (
            <div
              aria-live="polite"
              className="boot-line mb-5 flex items-center gap-2 rounded-xl border border-green-400/30 bg-green-500/10 p-3 text-sm text-green-100"
            >
              <svg className="check-mark h-4 w-4 flex-none" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 12.5l5 5 11-12" />
              </svg>
              <span>{message}</span>
            </div>
          )}

          {status === 'error' && (
            <div
              role="alert"
              className="animate-error-shake mb-5 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100"
            >
              {message}
            </div>
          )}

          <form
            onSubmit={(e) => {
              void handleSubmit(e);
            }}
            className="space-y-4"
          >
            <div className="animate-fade-up delay-200">
              <label
                htmlFor="edit-member-name"
                className="mb-1 block text-xs uppercase tracking-[0.18em] text-white/50"
              >
                Nome <span aria-hidden="true">*</span>
              </label>
              <input
                id="edit-member-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                disabled={isLoading}
                placeholder="Nome completo"
                className="input-glow w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/20 transition-colors duration-200 focus:border-white/25 focus:outline-none disabled:opacity-50"
              />
            </div>

            <div className="animate-fade-up delay-300">
              <label
                htmlFor="edit-member-bio"
                className="mb-1 block text-xs uppercase tracking-[0.18em] text-white/50"
              >
                Bio
              </label>
              <textarea
                id="edit-member-bio"
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                disabled={isLoading}
                rows={4}
                placeholder="Breve descrição sobre o membro"
                className="input-glow w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/20 transition-colors duration-200 focus:border-white/25 focus:outline-none disabled:opacity-50"
              />
            </div>

            <div className="animate-fade-up delay-400">
              <label
                htmlFor="edit-member-avatar"
                className="mb-1 block text-xs uppercase tracking-[0.18em] text-white/50"
              >
                Avatar URL
              </label>
              <AvatarPreview url={form.avatarUrl} />
              <input
                id="edit-member-avatar"
                value={form.avatarUrl}
                onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })}
                disabled={isLoading}
                placeholder="https://..."
                className="input-glow w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/20 transition-colors duration-200 focus:border-white/25 focus:outline-none disabled:opacity-50"
              />
            </div>

            <div className="animate-fade-up delay-500 pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className={`rounded-full bg-white px-8 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-black transition hover:bg-white/90 disabled:opacity-50 ${
                  isLoading ? 'btn-scanning' : ''
                }`}
              >
                {isLoading ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </form>
        </div>

        <p
          aria-hidden="true"
          style={{ animationDelay: '0.6s' }}
          className="boot-line mt-5 font-mono text-[11px] tracking-[0.04em] text-white/35"
        >
          $ member#{shortId} loaded
          <span className="ml-2 text-emerald-300/50">ok</span>
          <span className="login-caret ml-1">▊</span>
        </p>
      </div>
    </div>
  );
}
