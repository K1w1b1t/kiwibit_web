'use client';

import { useState } from 'react';
import {
  validateMember,
  type MemberFormValues,
} from '@/features/admin/members/model/validate-member';
import { AvatarPreview } from '@/features/admin/members/ui/avatar-preview';

type FormStatus = 'idle' | 'loading' | 'success' | 'error';

function emptyForm(): MemberFormValues {
  return { name: '', bio: '', avatarUrl: '' };
}

export function AdminMemberForm() {
  const [form, setForm] = useState<MemberFormValues>(emptyForm());
  const [status, setStatus] = useState<FormStatus>('idle');
  const [message, setMessage] = useState('');

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
      const response = await fetch('/api/admin/members', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          bio: form.bio.trim() || undefined,
          avatarUrl: form.avatarUrl.trim() || undefined,
        }),
      });

      const data = (await response.json()) as {
        success?: boolean;
        data?: { id: string };
        error?: { message: string };
      };

      if (!response.ok) {
        setStatus('error');
        setMessage(data.error?.message ?? 'Erro ao criar membro.');
        return;
      }

      setStatus('success');
      setMessage('Membro criado com sucesso.');
      setForm(emptyForm());
    } catch {
      setStatus('error');
      setMessage('Erro de conexão. Tente novamente.');
    }
  }

  const isLoading = status === 'loading';

  return (
    <div className="architectural-grid flex min-h-screen items-center justify-center bg-[#050505] px-6 py-16 text-white sm:px-10 lg:px-16">
      <div className="w-full max-w-xl">
        <div className="animate-fade-up mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/40">Admin</p>
          <h1 className="mt-2 text-4xl font-black uppercase tracking-[-0.03em]">Novo Membro</h1>
          <div className="mt-3 h-px w-12 bg-white/20" />
        </div>

        <div className="card-glow animate-fade-up delay-100 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm">
          {status === 'success' && (
            <div className="mb-5 rounded-xl border border-green-400/30 bg-green-500/10 p-3 text-sm text-green-100">
              {message}
            </div>
          )}

          {status === 'error' && (
            <div className="mb-5 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">
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
                htmlFor="new-member-name"
                className="mb-1 block text-xs uppercase tracking-[0.18em] text-white/50"
              >
                Nome <span aria-hidden="true">*</span>
              </label>
              <input
                id="new-member-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                disabled={isLoading}
                placeholder="Nome completo"
                className="input-glow w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/20 transition-colors duration-200 focus:border-white/25 focus:outline-none disabled:opacity-50"
              />
            </div>

            <div className="animate-fade-up delay-300">
              <label
                htmlFor="new-member-bio"
                className="mb-1 block text-xs uppercase tracking-[0.18em] text-white/50"
              >
                Bio
              </label>
              <textarea
                id="new-member-bio"
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
                htmlFor="new-member-avatar"
                className="mb-1 block text-xs uppercase tracking-[0.18em] text-white/50"
              >
                Avatar URL
              </label>
              <AvatarPreview url={form.avatarUrl} />
              <input
                id="new-member-avatar"
                value={form.avatarUrl}
                onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })}
                disabled={isLoading}
                placeholder="https://..."
                className="input-glow w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/20 transition-colors duration-200 focus:border-white/25 focus:outline-none disabled:opacity-50"
              />
            </div>

            <div className="animate-fade-up delay-400 pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="rounded-full bg-white px-8 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-black transition hover:bg-white/90 disabled:opacity-50"
              >
                {isLoading ? 'Criando...' : 'Criar membro'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
